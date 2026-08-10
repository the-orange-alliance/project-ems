import { getAppData, environment as env } from '@toa-lib/server';
import { AsyncDatabase } from 'promised-sqlite3';
import { sep, join, dirname } from 'path';
import { mkdir, readFile } from 'node:fs/promises';
import { ApiDatabaseError } from '@toa-lib/models';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
export let __dirname = dirname(__filename);

const eventMap: Map<string, EventDatabase> = new Map();

export async function getDB(name: string): Promise<EventDatabase> {
  if (eventMap.has(name)) {
    /* @ts-ignore */
    return eventMap.get(name);
  } else {
    eventMap.set(name, new EventDatabase(name));
    await eventMap.get(name)?.initDatabase();
    /* @ts-ignore */
    return eventMap.get(name);
  }
}

export async function initGlobal(): Promise<void> {
  const appRoot = env.get().appRoot;
  if (appRoot) {
    __dirname = appRoot;
  }

  const globalDb = await getDB('global');
  await globalDb.initDatabase();
  const query = await globalDb.getQueryFromFile('create_global.sql');
  await globalDb.db.exec(query);
}

export class EventDatabase {
  public db!: AsyncDatabase;
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  public async initDatabase(): Promise<void> {
    // Make sure our appdata path is created
    try {
      await mkdir(getAppData('ems'), { recursive: true });
      this.db = await AsyncDatabase.open(
        getAppData('ems') + sep + this.name + '.db'
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
      const columns = (await this.db.all(
        `PRAGMA table_info("${table}");`
      )) as { name: string }[];
      const names = columns.map((c) => c.name);
      if (!names.includes(from) || names.includes(to)) return;
      await this.db.exec(
        `ALTER TABLE "${table}" RENAME COLUMN "${from}" TO "${to}";`
      );
    } catch (e) {
      throw new ApiDatabaseError(table, e);
    }
  }

  private async tableExists(table: string): Promise<boolean> {
    const rows = await this.db.all(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?;`,
      [table]
    );
    return rows.length > 0;
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
      const columns = this.getColumns(values);
      const query = `INSERT INTO ${table} (${Array.from(
        columns
      ).toString()}) VALUES ${this.getValuesString(columns, values)};`;
      return await this.db.all(query);
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
      const update = this.getUpdateString(value);
      const query = `UPDATE ${table} SET ${update} WHERE ${where};`;
      return await this.db.all(query);
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
    try {
      const isProd = process.env.NODE_ENV === 'production';
      const path = isProd ? `${__dirname}/sql` : join(__dirname, '../../sql');
      const data = await readFile(join(path, sep, filePath));
      return data
        .toString()
        .replace(/\n/g, '')
        .replace(/\t/g, '')
        .replace(/\r/g, '');
    } catch (e) {
      throw e;
    }
  }

  private getUpdateString(value: Record<string, unknown>): string {
    return (
      Object.keys(value)
        // Prevent mapping all values to strings inside of SQL, if it's a string, wrap in quotes, if not, don't use quotes
        .map(
          (key: string) =>
            `"${key}" = ${
              typeof value[key] === 'string' ? `"${value[key]}"` : value[key]
            }`
        )
        .toString()
    );
  }

  private getValuesString(
    columns: Set<string>,
    values: Record<string, unknown>[]
  ): string {
    return values
      .map((obj: Record<string, unknown>) => {
        const valuesStr = Array.from(columns)
          .map((col) => {
            if (typeof obj[col] === 'undefined') {
              return 'null';
            } else if (typeof obj[col] === 'string') {
              return `'${obj[col]}'`;
            } else {
              return obj[col];
            }
          })
          .toString();
        return `(${valuesStr})`;
      })
      .toString();
  }

  private getColumns(values: Record<string, unknown>[]): Set<string> {
    const keys: Set<string> = new Set();
    values.map((obj: Record<string, unknown>) => {
      Object.keys(obj).map((key) => keys.add(key));
    });
    return keys;
  }
}
