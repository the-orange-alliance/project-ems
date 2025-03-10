import { getAppData, environment as env, environment } from '@toa-lib/server';
import { AsyncDatabase } from 'promised-sqlite3';
import { sep, join, dirname } from 'path';
import { mkdir, readFile } from 'node:fs/promises';
import { ApiDatabaseError } from '@toa-lib/models';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

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
    } catch (e) {
      throw e;
    }
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
