import { PromisedDatabase } from 'promised-sqlite3';
import { getAppData, environment as env } from '@toa-lib/server';
import { User } from '@toa-lib/models';
import { mkdir, readFile } from 'node:fs/promises';
import { sep, join } from 'path';

const db = new PromisedDatabase();

export async function initDataBase() {
  // Make sure our appdata path is created
  try {
    await mkdir(getAppData('ems'), { recursive: true });
    const dbFile = env.isProd() ? 'prod.db' : 'dev.db';
    db.open(getAppData('ems') + sep + dbFile);
  } catch (e) {
    throw e;
  }
}

export async function setupUsers(): Promise<User[]> {
  try {
    const createQuery = await getQueryFromFile('create_users.sql');
    await db.run(createQuery);

    const insertQuery = await getQueryFromFile('insert_users.sql');
    await db.run(insertQuery);

    const users = await selectAll<User>('users');
    return users;
  } catch (e) {
    throw e;
  }
}

export async function selectAll<T>(table: string): Promise<T[]> {
  try {
    return await db.all(`SELECT * FROM ${table};`);
  } catch (e) {
    throw e;
  }
}

/**
 * Internal async function to get a query from the sql/ directory in the api folder.
 * @param filePath - String that is the file's name or path if sub-folders exist.
 * @returns Promise<string> of the file's contents as an sql-safe string.
 */
async function getQueryFromFile(filePath: string): Promise<string> {
  try {
    const fullPath = join(__dirname, '../sql/' + filePath);
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
