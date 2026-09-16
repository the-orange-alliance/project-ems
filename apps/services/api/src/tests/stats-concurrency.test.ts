import test from 'node:test';
import assert from 'node:assert/strict';
import { AsyncDatabase } from 'promised-sqlite3';
import { join } from 'node:path';
import {
  definitions,
  normalizeQuery,
  type AuditRow
} from '@toa-lib/models/seasons/stats';
import { queryHash } from '@toa-lib/models/seasons/stats/query-hash';
import { EventDatabase } from '../db/EventDatabase.js';
import {
  commitMatchRevision,
  writeMatchRevisionSnapshot
} from '../controllers/Match.js';
import { StatsWorkerPool } from '../stats/StatsWorkerPool.js';
import { StatsDatabase } from '../stats/StatsDatabase.js';
import { StatsCache } from '../stats/StatsCache.js';
import { eventFixture, pause, until } from './stats-test-support.js';
test('three fields with four input sources, concurrent snapshots and statistics refresh', async () => {
  const f = await eventFixture(),
    path = join(f.root, f.ctx.eventKey + '.db'),
    database = new EventDatabase(f.ctx.eventKey, path),
    pool = new StatsWorkerPool({ workerCount: 1, timeoutMs: 30000 }),
    cacheDb = await StatsDatabase.open(join(f.root, 'load.stats.db')),
    cache = new StatsCache(pool, cacheDb, path, join(f.root, 'global.db'));
  database.db = f.db;
  const writers: AsyncDatabase[] = [],
    durations: number[] = [];
  try {
    const stat = definitions.find((d) => d.catalogueId === 'M1')!,
      query = normalizeQuery(
        {
          eventKey: f.ctx.eventKey,
          stat: stat.slug,
          filters: { tournamentKeys: ['q'] }
        },
        stat
      );
    for (let i = 0; i < 12; i++) {
      const db = await AsyncDatabase.open(path);
      await db.exec('PRAGMA busy_timeout=5000; PRAGMA synchronous=NORMAL');
      writers.push(db);
    }
    await cache.query(query, stat, 'fgc_2026');
    const writing = writers.map(async (db, source) => {
      const id = (source % 3) + 1;
      for (let i = 0; i < 30; i++) {
        const start = performance.now();
        await db.run(
          'INSERT INTO match_action_event(eventKey,tournamentKey,id,sourceEvent,fieldPath,oldValueJson,newValueJson,actorId,occurredAtUtc,persisted) VALUES (?,?,?,?,?,?,?,?,?,0)',
          [
            f.ctx.eventKey,
            'q',
            id,
            'match:updateDetailsItem',
            'details.wildfireInRedSuppressionUnit',
            String(i),
            String(i + 1),
            'source-' + source,
            new Date().toISOString()
          ]
        );
        durations.push(performance.now() - start);
        if (i % 10 === 0) await pause(1);
      }
    });
    const revisions = Array.from({ length: 3 }, (_, field) =>
      (async () => {
        for (let i = 0; i < 8; i++) {
          await writeMatchRevisionSnapshot(
            database,
            f.ctx.eventKey,
            'q',
            String(field + 1),
            { actionType: 'MATCH_DETAILS_PATCH', source: 'api' }
          );
          await pause(2);
        }
      })()
    );
    const refresh = (async () => {
      for (let i = 0; i < 20; i++) {
        await cache.query(query, stat, 'fgc_2026', true);
        await pause(10);
      }
    })();
    const outcomes = await Promise.allSettled([
      ...writing,
      ...revisions,
      refresh
    ]);
    for (const result of outcomes)
      if (result.status === 'rejected') throw result.reason;
    await until(() => pool.inspect().running.length === 0);
    const audit = await f.db.all<{ actorId: string }>(
      'SELECT actorId FROM match_action_event WHERE actorId LIKE ?',
      ['source-%']
    );
    assert.equal(audit.length, 360);
    const partial = await f.db.all(
      'SELECT b.historyId FROM match_history_base b LEFT JOIN match_detail_history d ON b.eventKey=d.eventKey AND b.tournamentKey=d.tournamentKey AND b.id=d.id AND b.revision=d.revision WHERE d.historyId IS NULL'
    );
    assert.equal(partial.length, 0);
    for (let id = 1; id <= 3; id++) {
      const rows = await f.db.all<{ revision: number }>(
        'SELECT revision FROM match_history_base WHERE tournamentKey=? AND id=? ORDER BY revision',
        ['q', id]
      );
      assert.equal(new Set(rows.map((r) => r.revision)).size, rows.length);
      assert.equal(rows.length, 11);
    }
    const journal = await f.db.get<{ journal_mode: string }>(
      'PRAGMA journal_mode'
    );
    assert.equal(journal.journal_mode, 'wal');
    durations.sort((a, b) => a - b);
    const p95 = durations[Math.floor(durations.length * 0.95)];
    console.log(
      '360 concurrent input writes; p95:',
      p95.toFixed(1),
      'ms; max:',
      Math.max(...durations).toFixed(1),
      'ms'
    );
    assert.ok(p95 < 2000, 'Match writes exceeded busy-timeout latency budget');
  } finally {
    await pool.close();
    for (const w of writers) await w.close();
    await cacheDb.close();
    await f.close();
  }
});
test('revision rollback is atomic and high watermark excludes later action arrivals', async () => {
  const f = await eventFixture(),
    database = new EventDatabase(
      f.ctx.eventKey,
      join(f.root, f.ctx.eventKey + '.db')
    );
  database.db = f.db;
  try {
    const before = await f.db.get<{ count: number }>(
      'SELECT COUNT(*) AS count FROM match_history_base'
    );
    const liveBefore = await f.db.get<{ redScore: number }>(
      'SELECT redScore FROM "match" WHERE eventKey=? AND tournamentKey=? AND id=?',
      [f.ctx.eventKey, 'q', 1]
    );
    await f.db.exec(
      "CREATE TRIGGER reject_detail BEFORE INSERT ON match_detail_history BEGIN SELECT RAISE(ABORT, 'forced detail failure'); END;"
    );
    await assert.rejects(
      commitMatchRevision(
        database,
        f.ctx.eventKey,
        'q',
        '1',
        { source: 'api', actionType: 'MATCH_PATCH' },
        [
          {
            table: 'match',
            values: { redScore: 987 },
            where: { eventKey: f.ctx.eventKey, tournamentKey: 'q', id: 1 }
          }
        ]
      ),
      /forced detail failure/
    );
    assert.equal(
      (
        await f.db.get<{ count: number }>(
          'SELECT COUNT(*) AS count FROM match_history_base'
        )
      ).count,
      before.count
    );
    assert.equal(
      (
        await f.db.get<{ redScore: number }>(
          'SELECT redScore FROM "match" WHERE eventKey=? AND tournamentKey=? AND id=?',
          [f.ctx.eventKey, 'q', 1]
        )
      ).redScore,
      liveBefore.redScore
    );
    await f.db.exec('DROP TRIGGER reject_detail');
    await f.db.run(
      'INSERT INTO match_action_event(eventKey,tournamentKey,id,sourceEvent,occurredAtUtc,persisted) VALUES (?,?,?,?,?,0)',
      [f.ctx.eventKey, 'q', 1, 'before', new Date().toISOString()]
    );
    const [{ actionEventId: watermark }] = await f.db.all<{
      actionEventId: number;
    }>('SELECT MAX(actionEventId) AS actionEventId FROM match_action_event');
    await writeMatchRevisionSnapshot(database, f.ctx.eventKey, 'q', '1', {
      source: 'api',
      actionType: 'MATCH_PATCH'
    });
    await f.db.run(
      'INSERT INTO match_action_event(eventKey,tournamentKey,id,sourceEvent,occurredAtUtc,persisted) VALUES (?,?,?,?,?,0)',
      [f.ctx.eventKey, 'q', 1, 'late', new Date().toISOString()]
    );
    const associated = await f.db.get<{ persisted: number; revision: number }>(
      'SELECT persisted,revision FROM match_action_event WHERE actionEventId=?',
      [watermark]
    );
    assert.equal(associated.persisted, 1);
    assert.equal(associated.revision, 4);
    const late = await f.db.get<{ persisted: number; revision: null }>(
      'SELECT persisted,revision FROM match_action_event WHERE sourceEvent=?',
      ['late']
    );
    assert.equal(late.persisted, 0);
    assert.equal(late.revision, null);
  } finally {
    await f.close();
  }
});
test('concurrent aggregate mutations are captured by their own revision', async () => {
  const f = await eventFixture(),
    database = new EventDatabase(
      f.ctx.eventKey,
      join(f.root, f.ctx.eventKey + '.db')
    );
  database.db = f.db;
  try {
    const writes = Array.from({ length: 20 }, (_, index) => ({
      score: 1000 + index,
      correlationId: `concurrent-${index}`
    }));
    await Promise.all(
      writes.map(({ score, correlationId }) =>
        commitMatchRevision(
          database,
          f.ctx.eventKey,
          'q',
          '1',
          { source: 'api', actionType: 'MATCH_PATCH', correlationId },
          [
            {
              table: 'match',
              values: { redScore: score },
              where: { eventKey: f.ctx.eventKey, tournamentKey: 'q', id: 1 }
            }
          ]
        )
      )
    );
    const snapshots = await f.db.all<{
      correlationId: string;
      redScore: number;
    }>(
      'SELECT correlationId,redScore FROM match_history_base WHERE correlationId LIKE ?',
      ['concurrent-%']
    );
    assert.equal(snapshots.length, writes.length);
    const expected = new Map(
      writes.map(({ correlationId, score }) => [correlationId, score])
    );
    for (const snapshot of snapshots)
      assert.equal(snapshot.redScore, expected.get(snapshot.correlationId));
  } finally {
    await f.close();
  }
});
