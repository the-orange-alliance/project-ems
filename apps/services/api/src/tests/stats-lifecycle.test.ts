import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler
} from 'fastify-type-provider-zod';
import { AsyncDatabase } from 'promised-sqlite3';
import { definitions } from '@toa-lib/models/seasons/stats';
import statsController from '../controllers/Stats.js';
import rankingController from '../controllers/Ranking.js';
import allianceController from '../controllers/Alliance.js';
import {
  StatsWorkerPool,
  StatsServiceError
} from '../stats/StatsWorkerPool.js';
import { getDB } from '../db/EventDatabase.js';
import { getStatsQueryService } from '../stats/StatsQueryService.js';
import { resetSourceRevisions } from '../stats/SourceRevisions.js';
import type { StatsWork } from '../stats/EventStatsSnapshot.js';
import { eventFixture, pause, until } from './stats-test-support.js';

const controlledEntry = new URL(
  './controlled-stats-worker.js',
  import.meta.url
);

function work(hash: string, params: object = {}): StatsWork {
  return {
    query: {
      eventKey: 'event',
      stat: 'generic.opr',
      selectors: {},
      filters: {},
      params: params as any
    },
    queryHash: hash,
    seasonKey: 'fgc_2026',
    calculatorVersion: 1,
    eventDatabasePath: 'unused',
    globalDatabasePath: 'unused'
  };
}

test('ranking and alliance API writes invalidate fresh cache entries; a hit adds no reads; a restart recomputes', async () => {
  const f = await eventFixture({ appData: true }),
    previousAppData = process.env.APPDATA,
    app = Fastify();
  // Points getDB() - used by the real ranking/alliance controllers - at the fixture.
  process.env.APPDATA = f.base;
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(statsController, {
    prefix: '/stats',
    databaseRoot: f.root,
    pool: new StatsWorkerPool({ timeoutMs: 20000 })
  });
  await app.register(rankingController, { prefix: '/ranking' });
  await app.register(allianceController, { prefix: '/alliance' });
  const service = getStatsQueryService(app),
    { pool } = service,
    // K3 groups by alliance and reads member qualification ranking score.
    stat = definitions.find((d) => d.catalogueId === 'K3')!,
    eventKey = f.ctx.eventKey,
    query = async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/stats/' + eventKey + '/query',
        payload: { stat: stat.slug }
      });
      assert.ok(response.statusCode < 500, response.body);
      return response.json();
    },
    settle = async () => {
      await until(
        () =>
          pool.inspect().running.length === 0 &&
          pool.inspect().queued.length === 0
      );
      await pause(50);
    },
    workerRuns: StatsWork[] = [],
    enqueue = pool.enqueue.bind(pool);
  pool.enqueue = (item, origin, waits) => {
    workerRuns.push(item);
    return enqueue(item, origin, waits);
  };
  try {
    const cold = await query();
    assert.equal(cold.cache, 'miss');
    assert.equal(cold.result.status, 'ok');
    assert.equal(cold.result.data.length, 4);
    assert.equal((await query()).cache, 'fresh');

    // A cache hit on unchanged data: no worker run, and exactly today's reads
    // (event season lookup + stat_cache row + three source-marker lookups).
    const runsBefore = workerRuns.length,
      proto = AsyncDatabase.prototype as unknown as Record<
        string,
        (...args: unknown[]) => unknown
      >,
      originals = new Map<string, (...args: unknown[]) => unknown>(),
      reads: string[] = [];
    for (const method of ['all', 'get', 'each', 'exec']) {
      const original = proto[method];
      originals.set(method, original);
      proto[method] = function (this: unknown, ...args: unknown[]) {
        reads.push(method + ': ' + String(args[0]).slice(0, 80));
        return original.apply(this, args);
      };
    }
    let hit;
    try {
      hit = await query();
    } finally {
      for (const [method, original] of originals) proto[method] = original;
    }
    assert.equal(hit.cache, 'fresh');
    assert.equal(workerRuns.length, runsBefore);
    assert.equal(reads.length, 5, reads.join('\n'));

    // Alliance API call: drop the finals alliances.
    const allianceDelete = await app.inject({
      method: 'DELETE',
      url: '/alliance/' + eventKey + '/f'
    });
    assert.equal(allianceDelete.statusCode, 200, allianceDelete.body);
    assert.notEqual((await query()).cache, 'fresh');
    await settle();
    const recomputedAlliance = await query();
    assert.equal(recomputedAlliance.cache, 'fresh');
    assert.deepEqual(
      recomputedAlliance.result.data.map(
        (row: { tournamentKey: string }) => row.tournamentKey
      ),
      ['p', 'p']
    );

    // Simulated API restart: in-memory revisions reset, stat_cache persists.
    resetSourceRevisions();
    assert.notEqual((await query()).cache, 'fresh');
    await settle();
    assert.equal((await query()).cache, 'fresh');

    // Ranking API call: delete qualification rankings.
    const rankingDelete = await app.inject({
      method: 'DELETE',
      url: '/ranking/' + eventKey + '/q'
    });
    assert.equal(rankingDelete.statusCode, 200, rankingDelete.body);
    assert.notEqual((await query()).cache, 'fresh');
    const recomputedRanking = await service.queryReady(eventKey, {
      stat: stat.slug
    });
    assert.equal(recomputedRanking.waitedForWorker, true);
    assert.equal(recomputedRanking.result.status, 'unavailable');
  } finally {
    await app.close();
    // The controllers' getDB() connection would otherwise hold the fixture file open.
    await (await getDB(f.ctx.eventKey)).db.close();
    if (previousAppData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = previousAppData;
    await f.close();
  }
});

test('a worker entry that cannot start parks the pool degraded instead of respawning without bound', async () => {
  const pool = new StatsWorkerPool({
      entry: new URL('./throwing-stats-worker.js', import.meta.url),
      timeoutMs: 60000
    }),
    app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(statsController, {
    prefix: '/stats',
    databaseRoot: 'unused',
    pool
  });
  try {
    const settledQueued = pool.enqueue(work('queued')).then(
      () => undefined,
      (error: unknown) => error
    );
    await until(() => Boolean(pool.inspect().degraded), 15000);
    const { degraded, spawnedWorkers } = pool.inspect();
    assert.ok(degraded);
    assert.match(degraded.entry, /throwing-stats-worker/);
    assert.match(degraded.error, /fixture import failure/);
    assert.equal(degraded.consecutiveStartFailures, spawnedWorkers);
    assert.ok(spawnedWorkers >= 2 && spawnedWorkers <= 10, 'bounded spawns');
    const queuedError = await settledQueued;
    assert.ok(queuedError instanceof StatsServiceError);
    assert.equal(queuedError.statusCode, 503);
    assert.match(queuedError.message, /degraded/);
    assert.match(queuedError.message, /fixture import failure/);
    assert.match(queuedError.message, /throwing-stats-worker/);
    await pause(1500);
    assert.equal(pool.inspect().spawnedWorkers, spawnedWorkers, 'parked');
    await assert.rejects(
      pool.enqueue(work('late')),
      (e: unknown) =>
        e instanceof StatsServiceError && /degraded/.test(e.message)
    );
    const queue = await app.inject('/stats/queue');
    assert.equal(queue.statusCode, 200, queue.body);
    assert.match(queue.json().degraded.error, /fixture import failure/);
    // Recovery is explicit and headless: it clears the parked state and retries.
    const recovered = await app.inject({
      method: 'POST',
      url: '/stats/queue/recover'
    });
    assert.equal(recovered.statusCode, 200, recovered.body);
    assert.equal(recovered.json().degraded, null);
    assert.ok(pool.inspect().spawnedWorkers > spawnedWorkers);
    // Still broken, so it parks again rather than spinning.
    await until(() => Boolean(pool.inspect().degraded), 15000);
  } finally {
    await pool.close();
    await app.close();
  }
});

test('a job that expires before reaching a worker fails as queue starvation, not an execution timeout', async () => {
  const pool = new StatsWorkerPool({
    entry: controlledEntry,
    capacity: 3,
    timeoutMs: 700
  });
  try {
    const running = pool.enqueue(work('running', { delayMs: 3000 })),
      starved = pool.enqueue(work('starved'));
    const [runningError, starvedError] = await Promise.all([
      running.then(
        () => assert.fail('running job should time out'),
        (e: unknown) => e
      ),
      starved.then(
        () => assert.fail('queued job should starve'),
        (e: unknown) => e
      )
    ]);
    assert.ok(runningError instanceof StatsServiceError);
    assert.equal(runningError.statusCode, 504);
    assert.match(runningError.message, /timed out/);
    assert.match(runningError.message, /generic\.opr/);
    assert.match(runningError.message, /ran \d+ ms on a worker/);
    assert.ok(starvedError instanceof StatsServiceError);
    assert.equal(starvedError.statusCode, 504);
    assert.doesNotMatch(starvedError.message, /timed out/);
    assert.match(starvedError.message, /never reached a worker/);
    assert.match(starvedError.message, /waited \d+ ms in the queue/);
    assert.match(starvedError.message, /queue depth \d+/);
    assert.match(starvedError.message, /end-to-end deadline/);
  } finally {
    await pool.close();
  }
});
