import type { AsyncDatabase } from 'promised-sqlite3';

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
    CREATE TABLE IF NOT EXISTS graphics_queue (
      eventKey TEXT PRIMARY KEY, data TEXT NOT NULL, updatedAtUtc TEXT);
    CREATE TABLE IF NOT EXISTS graphics_rundown (
      eventKey TEXT NOT NULL, rundownId TEXT NOT NULL, data TEXT NOT NULL,
      revision INTEGER NOT NULL, PRIMARY KEY(eventKey, rundownId));
    CREATE TABLE IF NOT EXISTS graphics_playback (
      eventKey TEXT PRIMARY KEY, data TEXT NOT NULL, revision INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS graphics_command (
      eventKey TEXT NOT NULL, requestId TEXT NOT NULL, fingerprint TEXT NOT NULL,
      acknowledgment TEXT NOT NULL, PRIMARY KEY(eventKey, requestId));
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
}
