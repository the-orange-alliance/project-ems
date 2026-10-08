import test from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { sep } from 'node:path';
import { getAppData } from '@toa-lib/server';
import { getDB } from '../db/EventDatabase.js';

const columns = async (db: Awaited<ReturnType<typeof getDB>>, table: string) =>
  ((await db.db.all(`PRAGMA table_info("${table}");`)) as { name: string }[]).map(
    (c) => c.name
  );

const cleanup = async (
  db: Awaited<ReturnType<typeof getDB>>,
  eventKey: string
) => {
  await db.db.close();
  const path = `${getAppData('ems')}${sep}${eventKey}.db`;
  for (const suffix of ['', '-wal', '-shm']) {
    await rm(path + suffix, { force: true });
  }
};

/**
 * The regression this guards: season columns are declared with bare
 * `ALTER TABLE ... ADD COLUMN`, which SQLite has no `IF NOT EXISTS` form of, so
 * `createEventGameSpecifics()` only ever runs on a fresh database. An event
 * created before a season column was added kept the old shape forever and every
 * write naming the column failed with `SQLITE_ERROR: no such column` - what
 * happened to events predating `coopertitionKnockdownBonus`.
 *
 * A base-only database is exactly the shape of such an old event: `match_detail`
 * exists with only the match key, and no season column at all.
 */
test('migrations add season columns to a database that predates them', async () => {
  const eventKey = `fgc_2026-seasoncols-${Date.now()}`;
  const db = await getDB(eventKey);
  try {
    await db.createEventBase();

    const before = await columns(db, 'match_detail');
    assert.ok(
      !before.includes('coopertitionKnockdownBonus'),
      'base schema should not already carry season columns'
    );

    await db.runMigrations();

    const after = await columns(db, 'match_detail');
    assert.ok(
      after.includes('coopertitionKnockdownBonus'),
      'the column named in the reported error must be added'
    );
    // A representative sample of the rest of the season sheet, so a partial
    // match of the season file is caught too.
    for (const column of [
      'wildfireInRedSuppressionUnit',
      'redRobotOneBraceState',
      'redClimbMultiplier',
      'bluePartnerClimbPoints',
      'coopertition'
    ]) {
      assert.ok(after.includes(column), `missing ${column}`);
    }

    // History rows are snapshotted with the same column list, so a migration
    // that fixed only `match_detail` would still fail on the first commit.
    const history = await columns(db, 'match_detail_history');
    assert.ok(history.includes('coopertitionKnockdownBonus'));
    assert.ok(history.includes('redPartnerClimbPoints'));

    // Ranking tiebreak columns come from the same file.
    const ranking = await columns(db, 'ranking');
    for (const column of ['rankingScore', 'highestScore', 'climbPoints']) {
      assert.ok(ranking.includes(column), `missing ranking.${column}`);
    }

    // Idempotent: runs on every database open, so a second pass must be a
    // no-op rather than a duplicate-column error.
    await db.runMigrations();
    assert.deepEqual(await columns(db, 'match_detail'), after);
  } finally {
    await cleanup(db, eventKey);
  }
});

test('a database name that resolves to no season is left alone', async () => {
  // `getSeasonKeyFromEventKey` gives 'notaseason' here, which has no SQL file.
  const eventKey = `notaseason-${Date.now()}`;
  const db = await getDB(eventKey);
  try {
    await db.createEventBase();
    await db.runMigrations();
    const cols = await columns(db, 'match_detail');
    assert.deepEqual(cols, ['eventKey', 'tournamentKey', 'id']);
  } finally {
    await cleanup(db, eventKey);
  }
});
