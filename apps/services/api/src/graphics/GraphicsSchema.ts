import {
  PRODUCER_SHOW_RUNDOWN_ID,
  PRODUCER_SHOW_RUNDOWN_NAME,
  rundownZod,
  showEntriesFromQueue,
  type Rundown
} from '@toa-lib/models';
import { z } from 'zod';
import type { AsyncDatabase } from 'promised-sqlite3';
import logger from '../util/Logger.js';

// Read-only decoder for databases written before show consolidation.
const legacyQueueEntryZod = z.object({
  entryId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  timelineId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  values: z.record(z.string().min(1), z.number().int().positive()),
  note: z.string().max(500).optional()
}).strict();

/** Recorded in `graphics_migration` once the queue->rundown consolidation has run for a database. */
const QUEUE_TO_RUNDOWN = 'graphics-queue-to-producer-show-v1';

/** Called only for event databases. Never rewrites producer-authored JSON. */
export async function migrateGraphicsDatabase(
  db: AsyncDatabase
): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS graphics_timeline (
      timelineId TEXT NOT NULL, eventKey TEXT NOT NULL, name TEXT NOT NULL,
      description TEXT, data TEXT NOT NULL, sortOrder INTEGER NOT NULL DEFAULT 0,
      updatedAtUtc TEXT, schemaVersion INTEGER NOT NULL DEFAULT 1,
      revision INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(eventKey, timelineId));
    CREATE TABLE IF NOT EXISTS graphics_rundown (
      eventKey TEXT NOT NULL, rundownId TEXT NOT NULL, data TEXT NOT NULL,
      revision INTEGER NOT NULL, PRIMARY KEY(eventKey, rundownId));
    CREATE TABLE IF NOT EXISTS graphics_playback (
      eventKey TEXT PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS graphics_command (
      eventKey TEXT NOT NULL, requestId TEXT NOT NULL, fingerprint TEXT NOT NULL,
      acknowledgment TEXT NOT NULL, PRIMARY KEY(eventKey, requestId));
    CREATE TABLE IF NOT EXISTS graphics_migration (
      name TEXT PRIMARY KEY, appliedAtUtc TEXT NOT NULL, detail TEXT);
  `);
  const columns = await db.all<{ name: string }>(
    'PRAGMA table_info(graphics_timeline)'
  );
  for (const [name, definition] of [
    ['schemaVersion', 'INTEGER NOT NULL DEFAULT 1'],
    ['revision', 'INTEGER NOT NULL DEFAULT 0']
  ]) {
    if (!columns.some((column) => column.name === name)) {
      await db.exec(
        `ALTER TABLE graphics_timeline ADD COLUMN ${name} ${definition}`
      );
    }
  }
  await migrateQueueToProducerShow(db);
}

/**
 * Folds every legacy `graphics_queue` row into that event's producer-show
 * rundown, exactly once per database.
 *
 * Runs inside the caller's `BEGIN IMMEDIATE` transaction (see
 * `GraphicsRepository.transaction`), so the marker row and the rundown rows
 * commit together - a crash mid-migration rolls both back and the next open
 * retries from the original queue rows. The marker is what makes a restart
 * idempotent rather than duplicating entries.
 *
 * Deliberately NON-destructive: the `graphics_queue` row is left exactly as it
 * was, so the pre-migration order remains recoverable by hand. Fresh databases
 * do not create this obsolete table. A queue row for an event that already has a producer-show
 * rundown is skipped rather than overwriting live show order.
 */
async function migrateQueueToProducerShow(db: AsyncDatabase): Promise<void> {
  const [applied] = await db.all<{ name: string }>(
    'SELECT name FROM graphics_migration WHERE name=?',
    [QUEUE_TO_RUNDOWN]
  );
  if (applied) return;
  const [queueTable] = await db.all(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='graphics_queue'"
  );
  if (!queueTable) return;
  const rows = await db.all<{
    eventKey: string;
    data: string;
    updatedAtUtc: string | null;
  }>('SELECT eventKey,data,updatedAtUtc FROM graphics_queue');
  const migrated: string[] = [];
  for (const row of rows) {
    const rundown = producerShowFromQueueRow(row);
    if (!rundown) continue;
    const [existing] = await db.all(
      'SELECT rundownId FROM graphics_rundown WHERE eventKey=? AND rundownId=?',
      [row.eventKey, PRODUCER_SHOW_RUNDOWN_ID]
    );
    if (existing) {
      logger.warn(
        `Graphics: event ${row.eventKey} already has a "${PRODUCER_SHOW_RUNDOWN_ID}" rundown; its legacy graphics_queue row was left untouched instead of overwriting live show order.`
      );
      continue;
    }
    await db.run(
      'INSERT INTO graphics_rundown(eventKey,rundownId,data,revision) VALUES(?,?,?,0)',
      [row.eventKey, PRODUCER_SHOW_RUNDOWN_ID, JSON.stringify(rundown)]
    );
    migrated.push(`${row.eventKey}:${rundown.entries.length}`);
  }
  await db.run(
    'INSERT INTO graphics_migration(name,appliedAtUtc,detail) VALUES(?,?,?)',
    [
      QUEUE_TO_RUNDOWN,
      new Date().toISOString(),
      migrated.length > 0 ? migrated.join(',') : 'no queue rows'
    ]
  );
}

/**
 * `null` when there is nothing to migrate - an empty queue, or one whose JSON
 * no longer parses. A corrupt row is logged and skipped rather than thrown:
 * throwing here would fail the schema migration that runs at the top of EVERY
 * graphics transaction, taking the whole event's graphics offline mid-show
 * over one unreadable legacy row that is preserved on disk regardless.
 */
function producerShowFromQueueRow(row: {
  eventKey: string;
  data: string;
  updatedAtUtc: string | null;
}): Rundown | null {
  let entries;
  try {
    entries = z.array(legacyQueueEntryZod).parse(JSON.parse(row.data));
  } catch {
    logger.warn(
      `Graphics: the legacy graphics_queue row for event ${row.eventKey} is corrupt or uses an unsupported schema; it was preserved on disk and NOT migrated into a rundown.`
    );
    return null;
  }
  if (entries.length === 0) return null;
  // `CueQueue.updatedAtUtc` was a free-form string; a rundown's must be a real
  // ISO instant. Keep the operator's own timestamp when it is one, and fall
  // back to migration time rather than discarding the entries over it.
  const updatedAtUtc = Number.isNaN(Date.parse(row.updatedAtUtc ?? ''))
    ? new Date().toISOString()
    : new Date(row.updatedAtUtc as string).toISOString();
  try {
    return rundownZod.parse({
      schemaVersion: 2,
      revision: 0,
      rundownId: PRODUCER_SHOW_RUNDOWN_ID,
      eventKey: row.eventKey,
      name: PRODUCER_SHOW_RUNDOWN_NAME,
      entries: showEntriesFromQueue(entries),
      // Preserve when the operator last touched this order, not migration time.
      updatedAtUtc
    });
  } catch {
    logger.warn(
      `Graphics: the legacy graphics_queue row for event ${row.eventKey} could not be expressed as a rundown; it was preserved on disk and NOT migrated.`
    );
    return null;
  }
}
