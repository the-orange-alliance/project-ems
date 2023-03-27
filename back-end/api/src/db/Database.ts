import { PromisedDatabase } from 'promised-sqlite3';
import { getAppData, environment as env } from '@toa-lib/server';
import { ApiDatabaseError } from '@toa-lib/models';
import { mkdir, readFile } from 'node:fs/promises';
import { sep, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

const db = new PromisedDatabase();

export async function initDatabase() {
  // Make sure our appdata path is created
  try {
    await mkdir(getAppData('ems'), { recursive: true });
    const dbFile = env.isProd() ? 'prod.db' : 'dev.db';
    db.open(getAppData('ems') + sep + dbFile);
  } catch (e) {
    throw e;
  }
}

export async function setupUsers(): Promise<void> {
  try {
    const createQuery = await getQueryFromFile('create_users.sql');
    await db.exec(createQuery);
    return;
  } catch (e) {
    throw e;
  }
}

export async function insertUsers(): Promise<void> {
  try {
    const insertQuery = await getQueryFromFile('insert_users.sql');
    await db.exec(insertQuery);
    return;
  } catch (e) {
    throw e;
  }
}

export async function createEventBase(): Promise<void> {
  try {
    const createQuery = await getQueryFromFile('create_event.sql');
    await db.exec(createQuery);
    return;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

export async function createEventGameSpecifics(
  seasonKey: string
): Promise<void> {
  try {
    const createQuery = await getQueryFromFile(`seasons/${seasonKey}.sql`);
    await db.exec(createQuery);
    return;
  } catch (e) {
    throw e;
  }
}

export async function purgeAll(): Promise<void> {
  try {
    const purgeQuery = await getQueryFromFile('purge.sql');
    await db.exec(purgeQuery);
    return;
  } catch (e) {
    throw e;
  }
}

export async function selectAll(table: string): Promise<any[]> {
  try {
    return await db.all(`SELECT * FROM ${table};`);
  } catch (e) {
    throw new ApiDatabaseError(table, e);
  }
}

export async function selectAllWhere(
  table: string,
  where: string
): Promise<any[]> {
  try {
    return await db.all(`SELECT * FROM ${table} WHERE ${where};`);
  } catch (e) {
    throw new ApiDatabaseError(table, e);
  }
}

export async function selectAllJoin(
  table1: string,
  table2: string,
  column: string
): Promise<any[]> {
  try {
    return await db.all(
      `SELECT * FROM "${table1}" INNER JOIN "${table2}" ON "${table1}".${column} = "${table2}".${column};`
    );
  } catch (e) {
    throw new ApiDatabaseError(`[${table1} ${table2}]`, e);
  }
}

export async function selectAllJoinWhere(
  table1: string,
  table2: string,
  column: string,
  where: string
): Promise<any[]> {
  try {
    return await db.all(
      `SELECT * FROM "${table1}" INNER JOIN "${table2}" ON "${table1}".${column} = "${table2}".${column} WHERE ${where};`
    );
  } catch (e) {
    throw new ApiDatabaseError(`[${table1} ${table2}]`, e);
  }
}

export async function deleteWhere(
  table: string,
  where: string
): Promise<any[]> {
  try {
    return await db.all(`DELETE FROM ${table} WHERE ${where};`);
  } catch (e) {
    throw new ApiDatabaseError(table, e);
  }
}

export async function insertValue<T>(
  table: string,
  values: Record<keyof NonNullable<T>, unknown>[]
) {
  try {
    const columns = getColumns(values);
    const query = `INSERT INTO ${table} (${Array.from(
      columns
    ).toString()}) VALUES ${getValuesString(columns, values)};`;
    return await db.all(query);
  } catch (e) {
    throw new ApiDatabaseError(table, e);
  }
}

export async function updateWhere<T>(
  table: string,
  value: Record<keyof NonNullable<T>, unknown>,
  where: string
) {
  try {
    const update = getUpdateString(value);
    const query = `UPDATE ${table} SET ${update} WHERE ${where};`;
    return await db.all(query);
  } catch (e) {
    throw new ApiDatabaseError(table, e);
  }
}

/**
 * Internal async function to get a query from the sql/ directory in the api folder.
 * @param filePath - String that is the file's name or path if sub-folders exist.
 * @returns Promise<string> of the file's contents as an sql-safe string.
 */
async function getQueryFromFile(filePath: string): Promise<string> {
  try {
    const fullPath = join(__dirname, '../../sql/' + filePath);
    const data = await readFile(fullPath);
    return data
      .toString()
      .replace(/\n/g, '')
      .replace(/\t/g, '')
      .replace(/\r/g, '');
  } catch (e) {
    throw e;
  }
}

function getUpdateString(value: Record<string, unknown>): string {
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

function getValuesString(
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

function getColumns(values: Record<string, unknown>[]): Set<string> {
  const keys: Set<string> = new Set();
  values.map((obj: Record<string, unknown>) => {
    Object.keys(obj).map((key) => keys.add(key));
  });
  return keys;
}
