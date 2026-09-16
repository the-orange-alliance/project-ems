import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler
} from 'fastify-type-provider-zod';
import { join } from 'node:path';
import {
  definitions,
  normalizeQuery,
  type StatDefinition,
  type StatsQuery,
  canonicalJson
} from '@toa-lib/models/seasons/stats';
import { queryHash } from '@toa-lib/models/seasons/stats/query-hash';
import statsController from '../controllers/Stats.js';
import {
  StatsWorkerPool,
  StatsServiceError
} from '../stats/StatsWorkerPool.js';
import { StatsDatabase } from '../stats/StatsDatabase.js';
import { StatsCache } from '../stats/StatsCache.js';
import {
  readSourceMarker,
  type StatsWork
} from '../stats/EventStatsSnapshot.js';
import { eventFixture, pause, until } from './stats-test-support.js';
const entry = new URL('./controlled-stats-worker.js', import.meta.url);
test('API event-wide and exact tournament filters, authoritative season, fresh/stale/cold cache', async () => {
  const f = await eventFixture(),
    pool = new StatsWorkerPool({ timeoutMs: 20000 }),
    app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.get('/heartbeat', async () => ({ ok: true }));
  await app.register(statsController, {
    prefix: '/stats',
    databaseRoot: f.root,
    pool
  });
  try {
    const catalogue = await app.inject(
      '/stats/' + f.ctx.eventKey + '/catalogue'
    );
    assert.equal(catalogue.statusCode, 200, catalogue.body);
    assert.equal(catalogue.json().length, 232);
    const d = definitions.find((d) => d.catalogueId === 'B21')!,
      url = '/stats/' + f.ctx.eventKey + '/query',
      query = (body: object) =>
        app.inject({ method: 'POST', url, payload: { stat: d.slug, ...body } });
    const [cold, joined] = await Promise.all([query({}), query({})]);
    assert.equal(cold.statusCode, 200, cold.body);
    assert.equal(joined.statusCode, 200, joined.body);
    assert.equal(cold.json().cache, 'miss');
    const fresh = await query({});
    assert.equal(fresh.json().cache, 'fresh');
    assert.equal(fresh.json().selectedTournamentKeys.length, 4);
    const ranking = await query({ filters: { tournamentTypes: ['Ranking'] } });
    assert.equal(ranking.statusCode, 200, ranking.body);
    assert.deepEqual(ranking.json().selectedTournamentKeys, ['r']);
    const exact = await query({ filters: { tournamentLevels: [20] } });
    assert.deepEqual(exact.json().selectedTournamentKeys, ['p']);
    const keys = await query({ filters: { tournamentKeys: ['f'] } });
    assert.deepEqual(keys.json().selectedTournamentKeys, ['f']);
    const bad = await app.inject({
      method: 'POST',
      url,
      payload: {
        stat: definitions.find((d) => d.catalogueId === 'A29')!.slug,
        filters: { tournamentTypes: ['Round Robin'] }
      }
    });
    assert.equal(bad.statusCode, 400);
    const badKey = await app.inject({
      method: 'POST',
      url,
      payload: {
        stat: definitions.find((d) => d.catalogueId === 'A29')!.slug,
        filters: { tournamentKeys: ['p'] }
      }
    });
    assert.equal(badKey.statusCode, 400, badKey.body);
    const replayStat = definitions.find((d) => d.catalogueId === 'M15')!;
    const replay = await app.inject({
      method: 'POST',
      url,
      payload: {
        stat: replayStat.slug,
        filters: { tournamentKeys: ['q'] },
        selectors: { matchId: 1 },
        params: { atUtc: '2026-09-01T12:02:00.000Z' }
      }
    });
    assert.equal(replay.statusCode, 200, replay.body);
    const replayFresh = await app.inject({
      method: 'POST',
      url,
      payload: {
        stat: replayStat.slug,
        filters: { tournamentKeys: ['q'] },
        selectors: { matchId: 1 },
        params: { atUtc: '2026-09-01T12:02:00.000Z' }
      }
    });
    assert.equal(replayFresh.json().cache, 'fresh');
    await f.db.run(
      'UPDATE "match" SET updatedAtUtc = ? WHERE tournamentKey = ? AND id = ?',
      ['2099-01-01T00:00:00.000Z', 'q', 1]
    );
    const stale = await query({});
    assert.equal(stale.json().cache, 'stale');
    assert.equal(stale.json().waitedForWorker, false);
    assert.equal(stale.json().result.data, cold.json().result.data);
    await until(
      () =>
        pool.inspect().running.length === 0 &&
        pool.inspect().queued.length === 0
    );
    await pause(50);
    assert.equal((await query({})).json().cache, 'fresh');
    assert.equal(
      (
        await f.db.all(
          "SELECT name FROM sqlite_master WHERE name = 'stat_cache'"
        )
      ).length,
      0
    );
    const inspect = await app.inject('/stats/queue');
    assert.equal(inspect.statusCode, 200);
    assert.equal(inspect.json().workerCount, 1);
  } finally {
    await app.close();
    await f.close();
  }
});
test('queue inspection, atomic ordering, conflicts, single-flight, overload and heartbeat', async () => {
  const pool = new StatsWorkerPool({ entry, capacity: 3, timeoutMs: 12000 }),
    app = Fastify();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.get('/heartbeat', async () => ({ ok: true }));
  await app.register(statsController, {
    prefix: '/stats',
    databaseRoot: 'unused',
    pool
  });
  const work = (
    hash: string,
    params: Record<string, unknown> = {}
  ): StatsWork => ({
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
  });
  try {
    const running = pool.enqueue(work('running', { delayMs: 1500 })),
      first = pool.enqueue(work('a')),
      second = pool.enqueue(work('b')),
      third = pool.enqueue(work('c'));
    const joined = pool.enqueue(work('a'));
    assert.equal(first, joined);
    const initial = pool.inspect();
    assert.equal(initial.running.length, 1);
    assert.equal(initial.queued.length, 3);
    assert.equal(initial.queued[0].waitingRequestCount, 2);
    await assert.rejects(pool.enqueue(work('overflow')), /full/);
    const reversed = initial.queued.map((j) => j.jobId).reverse(),
      updated = pool.reorder(initial.queueVersion, reversed);
    assert.deepEqual(
      updated.queued.map((j) => j.jobId),
      reversed
    );
    assert.equal(pool.enqueue(work('a')), first);
    const inspected = await app.inject('/stats/queue');
    assert.equal(inspected.statusCode, 200);
    const ordered = await app.inject({
      method: 'PUT',
      url: '/stats/queue/order',
      payload: {
        expectedQueueVersion: updated.queueVersion,
        orderedJobIds: reversed
      }
    });
    assert.equal(ordered.statusCode, 200, ordered.body);
    const conflict = await app.inject({
      method: 'PUT',
      url: '/stats/queue/order',
      payload: {
        expectedQueueVersion: updated.queueVersion,
        orderedJobIds: reversed
      }
    });
    assert.equal(conflict.statusCode, 409);
    const badOrder = await app.inject({
      method: 'PUT',
      url: '/stats/queue/order',
      payload: {
        expectedQueueVersion: pool.inspect().queueVersion,
        orderedJobIds: reversed.slice(1)
      }
    });
    assert.equal(badOrder.statusCode, 400);
    for (const ids of [
      [reversed[0], reversed[0], reversed[2]],
      reversed.slice(1),
      [...reversed.slice(1), initial.running[0].jobId],
      [...reversed.slice(1), '00000000-0000-4000-8000-000000000000']
    ]) {
      const before = pool.inspect();
      assert.throws(() => pool.reorder(before.queueVersion, ids));
      assert.deepEqual(pool.inspect(), before);
    }
    assert.throws(
      () => pool.reorder(initial.queueVersion, reversed),
      (e: unknown) => e instanceof StatsServiceError && e.statusCode === 409
    );
    const latencies: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      assert.equal((await app.inject('/heartbeat')).statusCode, 200);
      latencies.push(performance.now() - start);
      await pause(15);
    }
    assert.ok(
      Math.max(...latencies) < 500,
      'Heartbeat exceeded 500ms: ' + Math.max(...latencies)
    );
    console.log(
      'Heartbeat max during busy worker:',
      Math.max(...latencies).toFixed(1),
      'ms'
    );
    await Promise.all([running, first, second, third, joined]);
    assert.equal(pool.inspect().queued.length, 0);
  } finally {
    await pool.close();
    await app.close();
  }
});
test('worker timeout, crash, invalid JSON and unavailable response preserve replacement ability', async () => {
  const pool = new StatsWorkerPool({ entry, capacity: 3, timeoutMs: 700 }),
    work = (hash: string, params: object): StatsWork => ({
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
    });
  try {
    await assert.rejects(
      pool.enqueue(work('timeout', { delayMs: 2000 })),
      /timed out/
    );
    await pause(50);
    await assert.rejects(
      pool.enqueue(work('crash', { crash: true })),
      /exited/
    );
    await pause(50);
    await assert.rejects(pool.enqueue(work('invalid', { invalid: true })));
    assert.equal(
      (await pool.enqueue(work('unavailable', { unavailable: true }))).result
        .status,
      'unavailable'
    );
    assert.equal((await pool.enqueue(work('good', {}))).result.status, 'ok');
  } finally {
    await pool.close();
  }
});
test('cache failures and version changes retain good values; retention is bounded', async () => {
  const f = await eventFixture(),
    database = await StatsDatabase.open(join(f.root, 'cache.stats.db'), 2),
    pool = new StatsWorkerPool({ entry, timeoutMs: 10000 }),
    cache = new StatsCache(
      pool,
      database,
      join(f.root, f.ctx.eventKey + '.db'),
      join(f.root, 'global.db')
    );
  const definition = definitions.find((d) => d.catalogueId === 'B21')!,
    base = normalizeQuery(
      { eventKey: f.ctx.eventKey, stat: definition.slug },
      definition
    );
  try {
    const marker = await readSourceMarker(f.db, base),
      good = {
        result: {
          status: 'ok' as const,
          data: 42,
          quality: 'complete' as const,
          warnings: []
        },
        calculatorVersion: 1,
        computeMs: 1,
        calculatedAsOfUtc: new Date().toISOString(),
        latestPlayedMatch: null,
        sourceMarker: marker,
        selectedTournamentKeys: ['q', 'r', 'p', 'f']
      };
    const failing = { ...base, params: { ...base.params, fail: true } },
      hash = queryHash(failing);
    await database.put(hash, failing, definition, good);
    const response = await cache.query(
      failing,
      { ...definition, version: 2 },
      'fgc_2026'
    );
    assert.equal(response.cache, 'stale');
    assert.equal(response.calculatorVersion, 1);
    await until(() => pool.inspect().running.length === 0);
    await pause(25);
    assert.equal((await database.get(hash))!.calculatorVersion, 1);
    assert.equal(
      await database.put(hash, failing, definition, {
        ...good,
        result: { status: 'unavailable', reason: 'Absent', warnings: [] }
      }),
      false
    );
    assert.equal((await database.get(hash))!.result.status, 'ok');
    await assert.rejects(
      database.put(hash, failing, definition, {
        ...good,
        result: { ...good.result, data: NaN }
      })
    );
    const baseHash = queryHash(base);
    await database.put(baseHash, base, definition, good);
    assert.equal(
      (await cache.query(base, { ...definition, version: 2 }, 'fgc_2026'))
        .cache,
      'stale'
    );
    await until(() => pool.inspect().running.length === 0);
    await cache.drain();
    assert.equal((await database.get(baseHash))!.calculatorVersion, 2);
    for (let i = 0; i < 4; i++) {
      const q = { ...base, params: { ...base.params, window: i + 1 } };
      await database.put(queryHash(q), q, definition, good);
    }
    assert.equal((await database.db.all('SELECT * FROM stat_cache')).length, 2);
    assert.ok((await f.db.all('SELECT * FROM "match"')).length > 0);
  } finally {
    await pool.close();
    await database.close();
    await f.close();
  }
});

test('configured workers run concurrently and shutdown drains or cancels within its grace period', async () => {
  const work = (hash: string, delayMs = 50): StatsWork => ({
    query: {
      eventKey: 'event',
      stat: 'generic.opr',
      selectors: {},
      filters: {},
      params: { delayMs }
    },
    queryHash: hash,
    seasonKey: 'fgc_2026',
    calculatorVersion: 1,
    eventDatabasePath: 'unused',
    globalDatabasePath: 'unused'
  });
  const pool = new StatsWorkerPool({
    entry,
    workerCount: 2,
    capacity: 1,
    timeoutMs: 5000
  });
  const first = pool.enqueue(work('one')),
    second = pool.enqueue(work('two')),
    third = pool.enqueue(work('three'));
  assert.equal(pool.inspect().running.length, 2);
  assert.equal(pool.inspect().queued.length, 1);
  const closing = pool.close(3000);
  await assert.rejects(pool.enqueue(work('late')), /shutting down/);
  await Promise.all([first, second, third, closing]);
  assert.equal(pool.inspect().running.length, 0);
  const forced = new StatsWorkerPool({ entry, capacity: 1, timeoutMs: 5000 });
  const jobs = Promise.allSettled([
    forced.enqueue(work('long', 4000)),
    forced.enqueue(work('waiting', 4000))
  ]);
  const start = performance.now();
  await forced.close(25);
  assert.ok(performance.now() - start < 2000);
  assert.ok((await jobs).every((r) => r.status === 'rejected'));
  assert.equal(forced.inspect().queued.length, 0);
});

test('freshness lookups use the newest-row covering indexes', async () => {
  const f = await eventFixture();
  try {
    for (const [table, column, index] of [
      ['match', 'updatedAtUtc', 'idx_match_latest_update'],
      ['match_history_base', 'historyId', 'idx_match_history_base_latest'],
      ['match_action_event', 'actionEventId', 'idx_match_action_event_lookup']
    ]) {
      const plan = await f.db.all<{ detail: string }>(
        `EXPLAIN QUERY PLAN SELECT MAX((SELECT "${column}" FROM "${table}" source WHERE source.eventKey=t.eventKey AND source.tournamentKey=t.tournamentKey ORDER BY "${column}" DESC LIMIT 1)) FROM tournament t WHERE eventKey=?`,
        [f.ctx.eventKey]
      );
      assert.ok(
        plan.some(
          (row) => row.detail.includes(index) && row.detail.includes('COVERING')
        ),
        table
      );
      assert.ok(!plan.some((row) => row.detail.includes('SCAN source')), table);
    }
  } finally {
    await f.close();
  }
});
