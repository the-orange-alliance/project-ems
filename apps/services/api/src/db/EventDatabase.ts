import { getAppData, environment as env } from '@toa-lib/server';
import { AsyncDatabase } from 'promised-sqlite3';
import { sep, join, dirname } from 'path';
import { mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { ApiDatabaseError } from '@toa-lib/models';
import { fileURLToPath } from 'url';
import { migrateGraphicsDatabase } from '../graphics/GraphicsSchema.js';

const __filename = fileURLToPath(import.meta.url);
/** Immutable location of this module, used to find files that ship beside it. */
const moduleDir = dirname(__filename);
/**
 * Kept as a mutable export for historical callers (e.g. the MatchMaker binary
 * lookup in controllers/Match.ts) that expect `initGlobal()` to point it at
 * `APP_ROOT` in production. SQL-file resolution no longer depends on it — see
 * `resolveSqlDir()`.
 */
export let __dirname = moduleDir;

/**
 * The api ships a `sql/` directory next to its source. Where that directory
 * sits relative to this module depends on how the service was started:
 *
 *  - compiled, run normally:  `build/db/EventDatabase.js` -> `../../sql`
 *  - compiled to a flat dir:  `build/EventDatabase.js`    -> `../sql`
 *  - run from source (tsx):   `src/db/EventDatabase.ts`   -> `../../sql`
 *  - APP_ROOT override (Docker): `<APP_ROOT>/sql`
 *  - started from the package dir or repo root: relative to `process.cwd()`
 *
 * The previous implementation chose between `<dir>/sql` and `<dir>/../../sql`
 * purely from `NODE_ENV`, so a dev process that merely had `APP_ROOT` set (a
 * leftover value in a local `.env` is enough) resolved two levels above the app
 * root and crashed on the very first query. Probe every plausible location and
 * keep the first that actually contains the schema; cache it so the filesystem
 * is only touched once.
 */
let cachedSqlDir: string | undefined;
function resolveSqlDir(): string {
  if (cachedSqlDir) return cachedSqlDir;

  const { appRoot } = env.get();
  const candidates = [
    appRoot ? join(appRoot, 'sql') : undefined,
    join(moduleDir, '../../sql'),
    join(moduleDir, '../sql'),
    join(moduleDir, 'sql'),
    join(process.cwd(), 'sql'),
    join(process.cwd(), 'apps', 'services', 'api', 'sql')
  ].filter((candidate): candidate is string => Boolean(candidate));

  const found = candidates.find((dir) =>
    existsSync(join(dir, 'create_global.sql'))
  );

  if (!found) {
    throw new Error(
      `Unable to locate the api sql/ directory. Looked in:\n  ${candidates.join(
        '\n  '
      )}`
    );
  }

  cachedSqlDir = found;
  return found;
}

const eventMap = new Map<string, Promise<EventDatabase>>();
export async function getDB(name: string): Promise<EventDatabase> {
  let pending = eventMap.get(name);
  if (!pending) {
    const database = new EventDatabase(name);
    pending = database
      .initDatabase()
      .then(() => database)
      .catch((error) => {
        eventMap.delete(name);
        throw error;
      });
    eventMap.set(name, pending);
  }
  return pending;
}

export async function closeDB(name: string): Promise<void> {
  const pending = eventMap.get(name);
  if (pending) {
    const db = await pending;
    await db.db.close();
    eventMap.delete(name);
  }
}

export async function initGlobal(): Promise<void> {
  const { appRoot } = env.get();
  if (appRoot && existsSync(appRoot)) {
    __dirname = appRoot;
  } else if (appRoot) {
    // A stale APP_ROOT (e.g. left in a local .env by a previous test run) would
    // otherwise redirect every file lookup to a directory that doesn't exist.
    console.warn(
      `[EventDatabase] APP_ROOT is set to "${appRoot}" but that path does not exist; ignoring it and resolving files relative to the running module.`
    );
  }

  const globalDb = await getDB('global');
  const query = await globalDb.getQueryFromFile('create_global.sql');
  await globalDb.db.exec(query);
}

export class EventDatabase {
  public db!: AsyncDatabase;
  private name: string;

  constructor(
    name: string,
    private readonly databasePath?: string
  ) {
    this.name = name;
  }

  public async initDatabase(): Promise<void> {
    // Make sure our appdata path is created
    try {
      await mkdir(
        this.databasePath ? dirname(this.databasePath) : getAppData('ems'),
        { recursive: true }
      );
      this.db = await AsyncDatabase.open(
        this.databasePath ?? getAppData('ems') + sep + this.name + '.db'
      );
      // WAL lets readers proceed while a write is in flight, and NORMAL sync
      // only fsyncs at checkpoints instead of on every commit - together they
      // make the per-action history writes during a match far cheaper.
      await this.db.exec(
        'PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 5000;'
      );
      await this.runMigrations();
    } catch (e) {
      throw e;
    }
  }

  /**
   * Brings an already-existing database file up to date with the current schema.
   *
   * Every `create_*.sql` uses `CREATE TABLE IF NOT EXISTS`, which means schema
   * changes to those files only ever reach *new* databases — an event created
   * before a column was renamed would silently keep the old column and drop
   * writes to the new one on the floor. This is the seam where those changes get
   * applied to existing databases instead.
   *
   * Contract for every step in here:
   *  - **Idempotent.** This runs on every database open, so a step that has
   *    already been applied must be a no-op, not an error.
   *  - **Safe on a fresh database.** A brand new event DB has no tables at all
   *    until `createEventBase()` runs, so each step must check that its table
   *    exists before touching it.
   */
  public async runMigrations(): Promise<void> {
    // startTime -> actualStartTime. The old name read like "when the match
    // started" but actually held the scheduled time; see issue #236.
    await this.renameColumnIfPresent('match', 'startTime', 'actualStartTime');
    // Carried cards are scoped to a qualification/playoff phase rather than to
    // the whole event; this records which phase a team's card belongs to.
    await this.addColumnIfMissing('team', 'cardPhase', 'VARCHAR(15)');
    // Lets consumers reconcile which matches changed since their last poll,
    // and backs the `?since=` filter on the match routes; see issue #240.
    await this.addColumnIfMissing('match', 'updatedAtUtc', 'VARCHAR(255)');
    // Rows predating the column have no recorded write time. Stamp them now so
    // that `?since=` has a total order to work with: a null would have to be
    // either dropped from every filtered response (the consumer never learns
    // the match exists) or included in all of them (the filter saves nothing).
    // "as far as this server knows, last written at upgrade time" is the
    // conservative answer - an older cursor still sees the row, a newer one
    // correctly skips it.
    await this.backfillNullColumn(
      'match',
      'updatedAtUtc',
      new Date().toISOString()
    );
    // Revision snapshots link action events by `actionEventId` watermark, not
    // correlationId, so the correlationId-only index is pure write
    // amplification on the busiest table. Databases created before the
    // watermark change also carry the older lookup/persisted index shapes,
    // which `CREATE INDEX IF NOT EXISTS` would never replace.
    await this.db.exec(
      'DROP INDEX IF EXISTS "idx_match_action_event_correlation";'
    );
    await this.recreateIndexIfColumnsDiffer(
      'match_action_event',
      'idx_match_action_event_lookup',
      ['eventKey', 'tournamentKey', 'actionEventId']
    );
    await this.recreateIndexIfColumnsDiffer(
      'match_action_event',
      'idx_match_action_event_persisted',
      ['eventKey', 'tournamentKey', 'id', 'persisted', 'actionEventId']
    );
    if (this.name !== 'global') await migrateGraphicsDatabase(this.db);
  }

  /**
   * (Re)creates `index` on `table` with exactly `columns`, unless it already
   * has that definition. No-op when the table doesn't exist yet.
   */
  private async recreateIndexIfColumnsDiffer(
    table: string,
    index: string,
    columns: string[]
  ): Promise<void> {
    try {
      if (!(await this.tableExists(table))) return;
      const current = (
        (await this.db.all(`PRAGMA index_info("${index}");`)) as {
          name: string;
        }[]
      ).map((c) => c.name);
      if (current.join(',') === columns.join(',')) return;
      await this.db.exec(`DROP INDEX IF EXISTS "${index}";`);
      await this.db.exec(
        `CREATE INDEX "${index}" ON "${table}" (${columns
          .map((c) => `"${c}"`)
          .join(', ')});`
      );
    } catch (e) {
      throw new ApiDatabaseError(table, e);
    }
  }

  /**
   * Renames `from` to `to` on `table`, but only if the rename is actually
   * pending — i.e. the table exists, still has the old column, and does not yet
   * have the new one. Any other state is treated as already-migrated.
   */
  private async renameColumnIfPresent(
    table: string,
    from: string,
    to: string
  ): Promise<void> {
    try {
      if (!(await this.tableExists(table))) return;
      const names = await this.columnNames(table);
      if (!names.includes(from) || names.includes(to)) return;
      await this.db.exec(
        `ALTER TABLE "${table}" RENAME COLUMN "${from}" TO "${to}";`
      );
    } catch (e) {
      throw new ApiDatabaseError(table, e);
    }
  }

  /**
   * Adds `column` to `table`, but only if the table exists and does not already
   * have it. `type` is the column's DDL (e.g. `'VARCHAR(15)'`); it must be
   * nullable or carry a default, since existing rows will need a value.
   */
  private async addColumnIfMissing(
    table: string,
    column: string,
    type: string
  ): Promise<void> {
    try {
      if (!(await this.tableExists(table))) return;
      if (await this.columnNames(table).then((n) => n.includes(column))) return;
      await this.db.exec(
        `ALTER TABLE "${table}" ADD COLUMN "${column}" ${type};`
      );
    } catch (e) {
      throw new ApiDatabaseError(table, e);
    }
  }

  /**
   * Creates `table` using `createStatement` if it does not already exist.
   * `createStatement` must itself be a `CREATE TABLE IF NOT EXISTS` so this is
   * safe to run against a brand new database too (where `createEventBase()`
   * will go on to run the same statement from create_event.sql as a no-op).
   */
  private async createTableIfMissing(
    table: string,
    createStatement: string
  ): Promise<void> {
    try {
      if (await this.tableExists(table)) return;
      await this.db.exec(createStatement);
    } catch (e) {
      throw new ApiDatabaseError(table, e);
    }
  }

  /**
   * Gives `column` a value on rows that don't have one yet.
   *
   * Idempotent by construction: it only touches nulls, so a second run matches
   * nothing. No-ops on a database where `table` doesn't exist, and on a brand
   * new one it matches zero rows because inserts populate the column already.
   *
   * Doubles as a safety net — if a write path is ever missed, those rows pick
   * up a timestamp on the next restart instead of staying invisible to
   * timestamp-filtered queries forever.
   */
  private async backfillNullColumn(
    table: string,
    column: string,
    value: string
  ): Promise<void> {
    try {
      if (!(await this.tableExists(table))) return;
      if (!(await this.columnNames(table)).includes(column)) return;
      await this.db.all(
        `UPDATE "${table}" SET "${column}" = ? WHERE "${column}" IS NULL;`,
        [value]
      );
    } catch (e) {
      throw new ApiDatabaseError(table, e);
    }
  }

  private async columnNames(table: string): Promise<string[]> {
    const columns = (await this.db.all(`PRAGMA table_info("${table}");`)) as {
      name: string;
    }[];
    return columns.map((c) => c.name);
  }

  private async tableExists(table: string): Promise<boolean> {
    const rows = await this.db.all(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?;`,
      [table]
    );
    return rows.length > 0;
  }

  private revisionTail: Promise<unknown> = Promise.resolve();
  /** Serialize revision jobs, then execute each transaction in one native SQLite call. */
  public withRevisionConnection<T>(
    work: (db: AsyncDatabase) => Promise<T>
  ): Promise<T> {
    const pending = this.revisionTail
      .catch(() => {})
      .then(async () => {
        const connection = await AsyncDatabase.open(
          this.databasePath ?? getAppData('ems') + sep + this.name + '.db'
        );
        try {
          await connection.exec(
            'PRAGMA busy_timeout = 5000; PRAGMA synchronous = NORMAL;'
          );
          return await work(connection);
        } catch (error) {
          await connection.exec('ROLLBACK').catch(() => {});
          throw error;
        } finally {
          await connection.close();
        }
      });
    this.revisionTail = pending;
    return pending;
  }

  public async setupUsers(): Promise<void> {
    try {
      const createQuery = await this.getQueryFromFile('create_users.sql');
      await this.db.exec(createQuery);
      return;
    } catch (e) {
      throw e;
    }
  }

  public async insertUsers(): Promise<void> {
    try {
      const insertQuery = await this.getQueryFromFile('insert_users.sql');
      await this.db.exec(insertQuery);
      return;
    } catch (e) {
      throw e;
    }
  }

  public async createEventBase(): Promise<void> {
    try {
      const createQuery = await this.getQueryFromFile('create_event.sql');
      await this.db.exec(createQuery);
      return;
    } catch (e) {
      console.log(e);
      throw e;
    }
  }

  public async createEventGameSpecifics(seasonKey: string): Promise<void> {
    try {
      if (!seasonKey?.trim()) {
        // Without this guard an empty key builds the path `seasons/.sql`, whose
        // ENOENT (with its absolute path) would be forwarded to the client.
        throw new Error(
          'Cannot set up game-specific tables: seasonKey is missing.'
        );
      }
      const createQuery = await this.getQueryFromFile(
        `seasons/${seasonKey}.sql`
      );
      await this.db.exec(createQuery);
      return;
    } catch (e) {
      throw e;
    }
  }

  public async purgeAll(): Promise<void> {
    try {
      const purgeQuery = await this.getQueryFromFile('purge.sql');
      await this.db.exec(purgeQuery);
      return;
    } catch (e) {
      throw e;
    }
  }

  public async selectAll(table: string): Promise<any[]> {
    try {
      return await this.db.all(`SELECT * FROM ${table};`);
    } catch (e) {
      throw new ApiDatabaseError(table, e);
    }
  }

  public async selectAllWhere(table: string, where: string): Promise<any[]> {
    try {
      return await this.db.all(`SELECT * FROM ${table} WHERE ${where};`);
    } catch (e) {
      throw new ApiDatabaseError(table, e);
    }
  }

  public async selectAllJoin(
    table1: string,
    table2: string,
    column: string
  ): Promise<any[]> {
    try {
      return await this.db.all(
        `SELECT * FROM "${table1}" INNER JOIN "${table2}" ON "${table1}".${column} = "${table2}".${column};`
      );
    } catch (e) {
      throw new ApiDatabaseError(`[${table1} ${table2}]`, e);
    }
  }

  public async selectAllJoinWhere(
    table1: string,
    table2: string,
    column: string,
    where: string
  ): Promise<any[]> {
    try {
      return await this.db.all(
        `SELECT * FROM "${table1}" INNER JOIN "${table2}" ON "${table1}".${column} = "${table2}".${column} WHERE ${where};`
      );
    } catch (e) {
      throw new ApiDatabaseError(`[${table1} ${table2}]`, e);
    }
  }

  public async selectAllJoinWhereAdvanced(
    table1: string,
    table2: string,
    join: string,
    where: string
  ): Promise<any[]> {
    try {
      return await this.db.all(
        `SELECT * FROM "${table1}" INNER JOIN "${table2}" ON ${join} WHERE ${where};`
      );
    } catch (e) {
      throw new ApiDatabaseError(`[${table1} ${table2}]`, e);
    }
  }

  public async deleteWhere(table: string, where: string): Promise<any[]> {
    try {
      return await this.db.all(`DELETE FROM ${table} WHERE ${where};`);
    } catch (e) {
      throw new ApiDatabaseError(table, e);
    }
  }

  public async insertValue<T>(
    table: string,
    values: Record<keyof NonNullable<T>, unknown>[]
  ) {
    try {
      const columns = Array.from(this.getColumns(values));
      if (values.length === 0 || columns.length === 0) return [];
      // Bind values as parameters so strings containing quotes (e.g. "Côte d'Ivoire") are safe.
      // Chunk rows to stay under SQLite's bound-variable limit.
      const rowsPerQuery = Math.max(1, Math.floor(32000 / columns.length));
      const rowPlaceholder = `(${columns.map(() => '?').join(',')})`;
      const results: any[] = [];
      for (let i = 0; i < values.length; i += rowsPerQuery) {
        const chunk = values.slice(i, i + rowsPerQuery) as Record<
          string,
          unknown
        >[];
        const query = `INSERT INTO ${table} (${columns
          .map((c) => `"${c}"`)
          .join(',')}) VALUES ${chunk.map(() => rowPlaceholder).join(',')};`;
        const params = chunk.flatMap((obj) =>
          columns.map((col) => this.toParam(obj[col]))
        );
        results.push(...(await this.db.all(query, params)));
      }
      return results;
    } catch (e) {
      throw new ApiDatabaseError(table, e);
    }
  }

  public async updateWhere<T>(
    table: string,
    value: Record<keyof NonNullable<T>, unknown>,
    where: string
  ) {
    try {
      const valuesObj = value as Record<string, unknown>;
      const columns = Object.keys(valuesObj);
      const update = columns.map((col) => `"${col}" = ?`).join(', ');
      const query = `UPDATE ${table} SET ${update} WHERE ${where};`;
      return await this.db.all(
        query,
        columns.map((col) => this.toParam(valuesObj[col]))
      );
    } catch (e) {
      throw new ApiDatabaseError(table, e);
    }
  }

  public async upsert<T>(
    table: string,
    values: Record<keyof NonNullable<T>, unknown>,
    conflictColumns: string[]
  ) {
    try {
      const columns = Object.keys(values);
      const placeholders = columns.map(() => '?').join(', ');
      const updateAssignments = columns
        .filter((col) => !conflictColumns.includes(col))
        .map((col) => `"${col}"=excluded."${col}"`)
        .join(', ');
      const query = `INSERT INTO ${table} (${columns
        .map((c) => `"${c}"`)
        .join(', ')}) VALUES (${placeholders}) ON CONFLICT(${conflictColumns
        .map((c) => `"${c}"`)
        .join(', ')}) DO UPDATE SET ${updateAssignments};`;
      const valuesObj = values as Record<string, unknown>;
      const params = columns.map((col) => valuesObj[col]);
      return await this.db.all(query, params);
    } catch (e) {
      throw new ApiDatabaseError(table, e);
    }
  }

  /**
   * Internal async function to get a query from the sql/ directory in the api folder.
   * @param filePath - String that is the file's name or path if sub-folders exist.
   * @returns Promise<string> of the file's contents as an sql-safe string.
   */
  public async getQueryFromFile(filePath: string): Promise<string> {
    const data = await readFile(join(resolveSqlDir(), filePath));
    return data
      .toString()
      .replace(/\n/g, '')
      .replace(/\t/g, '')
      .replace(/\r/g, '');
  }

  private toParam(value: unknown): unknown {
    if (typeof value === 'undefined') return null;
    if (typeof value === 'number' && !Number.isFinite(value)) return null;
    if (typeof value === 'boolean') return value ? 1 : 0;
    return value;
  }

  private getColumns(values: Record<string, unknown>[]): Set<string> {
    const keys: Set<string> = new Set();
    values.map((obj: Record<string, unknown>) => {
      Object.keys(obj).map((key) => keys.add(key));
    });
    return keys;
  }
}
