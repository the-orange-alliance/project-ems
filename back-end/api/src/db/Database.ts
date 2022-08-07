import * as SQL from 'sqlite3';
import { getAppData, environment as env } from '@toa-lib/server';
import { mkdir } from 'fs';
import { sep } from 'path';
import logger from '../util/Logger';

class Database {
  private static _instance: Database;

  private db!: SQL.Database;

  public static getInstance(): Database {
    if (typeof Database._instance === 'undefined') {
      Database._instance = new Database();
    }
    return Database._instance;
  }

  private constructor() {}

  public async init() {
    // Make sure our appdata path is created
    try {
      await mkdir(getAppData('ems'), { recursive: true }, (err) => {
        if (err) logger.error(err);
      });
      const dbFile = env.isProd() ? 'prod.db' : 'dev.db';
      this.db = new SQL.Database(getAppData('ems') + sep + dbFile);
    } catch (e) {
      throw e;
    }
  }
}

export default Database.getInstance();
