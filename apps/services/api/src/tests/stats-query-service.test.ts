import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, basename, sep } from 'node:path';
import { AsyncDatabase } from 'promised-sqlite3';
import Fastify from 'fastify';
import { definitions, normalizeQuery } from '@toa-lib/models/seasons/stats';
import { queryHash } from '@toa-lib/models/seasons/stats/query-hash';
import {
  StatsQueryService,
  getStatsQueryService
} from '../stats/StatsQueryService.js';
import {
  StatsWorkerPool,
  StatsServiceError
} from '../stats/StatsWorkerPool.js';
import { StatsDatabase } from '../stats/StatsDatabase.js';
import { StatsCache } from '../stats/StatsCache.js';
import type { StatsWork } from '../stats/EventStatsSnapshot.js';
import { until } from './stats-test-support.js';

const entry = new URL('./controlled-stats-worker.js', import.meta.url);
const definition = definitions.find((item) => item.catalogueId === 'B21')!;

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'ems-stats-service-'));
  const global = await AsyncDatabase.open(join(root, 'global.db'));
  await global.exec(
    'CREATE TABLE event(eventKey TEXT PRIMARY KEY, seasonKey TEXT)'
  );
  await global.run('INSERT INTO event VALUES (?, ?), (?, ?)', [
    'first',
    'fgc_2026',
    'second',
    'unsupported_season'
  ]);
  const source = await AsyncDatabase.open(join(root, 'first.db'));
  // Empty tournaments produce null source markers, matching the controlled worker.
  await source.exec(
    'CREATE TABLE tournament(eventKey TEXT, tournamentKey TEXT)'
  );
  return {
    root,
    source,
    global,
    async close() {
      await source.close();
      await global.close();
      const absolute = resolve(root);
      assert.ok(absolute.startsWith(resolve(tmpdir()) + sep));
      assert.ok(basename(absolute).startsWith('ems-stats-service-'));
      await rm(absolute, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 100
      });
    }
  };
}

function blockingWork(): StatsWork {
  return {
    query: {
      eventKey: 'blocker',
      stat: 'generic.opr',
      selectors: {},
      filters: {},
      params: { delayMs: 500 }
    },
    queryHash: 'blocker',
    seasonKey: 'fgc_2026',
    calculatorVersion: 1,
    eventDatabasePath: 'unused',
    globalDatabasePath: 'unused'
  };
}

test(
  'queryFresh joins cached refresh and awaits the actual worker even if values are unchanged',
  { timeout: 20000 },
  async () => {
    const f = await fixture();
    const pool = new StatsWorkerPool({ entry });
    const service = new StatsQueryService({ databaseRoot: f.root, pool });
    const work: StatsWork[] = [];
    const enqueue = pool.enqueue.bind(pool);
    pool.enqueue = (item, origin, waiting) => {
      work.push(item);
      return enqueue(item, origin, waiting);
    };
    try {
      const cold = await service.query('first', { stat: definition.slug });
      assert.equal(cold.cache, 'miss');
      assert.equal(cold.waitedForWorker, true);
      assert.equal(work[0].seasonKey, 'fgc_2026');
      assert.equal(work[0].eventDatabasePath, join(f.root, 'first.db'));
      const fresh = await service.query('first', { stat: definition.slug });
      assert.equal(fresh.cache, 'fresh');
      assert.equal(fresh.waitedForWorker, false);
      const blocker = pool.enqueue(blockingWork());
      const stale = await service.query('first', {
        stat: definition.slug,
        refresh: true
      });
      assert.equal(stale.cache, 'stale');
      assert.equal(stale.waitedForWorker, false);
      assert.equal(stale.calculatedAsOfUtc, cold.calculatedAsOfUtc);
      let settled = false;
      const first = service
        .queryFresh('first', { stat: definition.slug })
        .then((value) => {
          settled = true;
          return value;
        });
      const second = service.queryFresh('first', { stat: definition.slug });
      await until(() =>
        pool.inspect().queued.some((job) => job.waitingRequestCount === 2)
      );
      assert.equal(settled, false);
      const [a, b] = await Promise.all([first, second]);
      await blocker;
      assert.equal(a.waitedForWorker, true);
      assert.equal(a.refreshQueued, false);
      assert.equal(a.cache, 'fresh');
      assert.equal(a.calculatedAsOfUtc, b.calculatedAsOfUtc);
      assert.deepEqual(a.result, cold.result);
      assert.equal(
        work.filter((item) => item.query.eventKey === 'first').length,
        2
      );
    } finally {
      await service.close();
      await f.close();
    }
  }
);

test(
  'fresh worker failures and non-ok results never substitute the old cached value',
  { timeout: 20000 },
  async () => {
    const f = await fixture();
    const pool = new StatsWorkerPool({ entry });
    const database = await StatsDatabase.open(join(f.root, 'test.stats.db'));
    const cache = new StatsCache(
      pool,
      database,
      join(f.root, 'first.db'),
      join(f.root, 'global.db')
    );
    const base = normalizeQuery(
      { eventKey: 'first', stat: definition.slug },
      definition
    );
    try {
      const {
        normalizedQuery,
        cache: cacheState,
        refreshQueued,
        waitedForWorker,
        cacheAgeMs,
        ...good
      } = await cache.queryFresh(base, definition, 'fgc_2026');
      const failures: Record<string, boolean>[] = [
        { fail: true },
        { unavailable: true }
      ];
      for (const params of failures) {
        const query = { ...base, params };
        await database.put(queryHash(query), query, definition, good);
        if ('fail' in params) {
          await assert.rejects(
            cache.queryFresh(query, definition, 'fgc_2026'),
            /fixture failure/
          );
        } else {
          const response = await cache.queryFresh(
            query,
            definition,
            'fgc_2026'
          );
          assert.equal(response.waitedForWorker, true);
          assert.equal(response.result.status, 'unavailable');
        }
        assert.equal(
          (await database.get(queryHash(query)))!.result.status,
          'ok'
        );
      }
    } finally {
      await pool.close();
      await cache.drain();
      await database.close();
      await f.close();
    }
  }
);

test(
  'shared service validates event identity, authoritative season and parameter refinements before creating caches',
  { timeout: 20000 },
  async () => {
    const f = await fixture();
    const service = new StatsQueryService({
      databaseRoot: f.root,
      pool: new StatsWorkerPool({ entry })
    });
    try {
      assert.equal((await service.catalogue('first')).length, 232);
      assert.equal(await service.resolveEvent('second'), 'unsupported_season');
      for (const [eventKey, body, status] of [
        ['../escape', { stat: definition.slug }, 400],
        ['missing', { stat: definition.slug }, 404],
        ['second', { stat: definition.slug }, 404],
        [
          'first',
          {
            stat: definitions.find((item) => item.catalogueId === 'M15')!.slug
          },
          400
        ],
        ['first', { stat: definition.slug, selectors: { matchId: 1 } }, 400]
      ] as const) {
        await assert.rejects(
          service.queryFresh(eventKey, body),
          (error: unknown) =>
            error instanceof StatsServiceError && error.statusCode === status
        );
      }
      assert.equal(
        (await readdir(f.root)).some((name) => name.endsWith('.stats.db')),
        false
      );
    } finally {
      await service.close();
      await assert.rejects(
        service.query('first', { stat: definition.slug }),
        /shutting down/
      );
      await f.close();
    }
  }
);

test(
  'encapsulated Fastify plugins share one service and reject conflicting dependencies',
  { timeout: 20000 },
  async () => {
    const f = await fixture();
    const app = Fastify();
    const pool = new StatsWorkerPool({ entry });
    let first: StatsQueryService | undefined;
    let second: StatsQueryService | undefined;
    let closeCount = 0;
    const close = pool.close.bind(pool);
    pool.close = async (...args) => {
      closeCount++;
      await close(...args);
    };
    try {
      app.register(async (plugin) => {
        first = getStatsQueryService(plugin, {
          databaseRoot: f.root,
          pool,
          cacheLimit: 5
        });
      });
      app.register(async (plugin) => {
        second = getStatsQueryService(plugin);
      });
      await app.ready();
      assert.equal(first, second);
      assert.throws(
        () =>
          getStatsQueryService(app, {
            databaseRoot: join(f.root, 'different')
          }),
        /different dependencies/
      );
      assert.throws(
        () => getStatsQueryService(app, { cacheLimit: 6 }),
        /different dependencies/
      );
      assert.equal(
        (await first!.query('first', { stat: definition.slug })).result.status,
        'ok'
      );
      await app.close();
      assert.equal(closeCount, 1);
    } finally {
      await app.close();
      await f.close();
    }
  }
);
