import { AsyncDatabase } from 'promised-sqlite3';
import {
  assertJson,
  canonicalJson,
  type StatsQuery,
  type StatDefinition
} from '@toa-lib/models/seasons/stats';
import { type WorkerResult, workerResultSchema } from './StatsSchemas.js';
export class StatsDatabase {
  private constructor(
    public readonly db: AsyncDatabase,
    readonly limit: number
  ) {}
  static async open(
    path: string,
    limit = Number(process.env.STATS_CACHE_LIMIT ?? 2000)
  ) {
    if (!Number.isInteger(limit) || limit < 1)
      throw new Error('Invalid statistics cache retention limit');
    const db = await AsyncDatabase.open(path);
    await db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS stat_cache (
 queryHash TEXT PRIMARY KEY, normalizedQueryJson TEXT NOT NULL, statSlug TEXT NOT NULL,catalogueId TEXT NOT NULL,eventKey TEXT NOT NULL,
 calculatorVersion INTEGER NOT NULL,resultJson TEXT NOT NULL,computeMs REAL NOT NULL,calculatedAsOfUtc TEXT NOT NULL,
 latestPlayedMatchJson TEXT,sourceMarkerJson TEXT NOT NULL,selectedTournamentKeysJson TEXT NOT NULL,quality TEXT NOT NULL,warningsJson TEXT NOT NULL,
 createdAtUtc TEXT NOT NULL,updatedAtUtc TEXT NOT NULL,lastAccessedAtUtc TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS idx_stat_cache_stat ON stat_cache(eventKey,statSlug);
 CREATE INDEX IF NOT EXISTS idx_stat_cache_access ON stat_cache(lastAccessedAtUtc);`);
    return new StatsDatabase(db, limit);
  }
  async get(
    hash: string
  ): Promise<(WorkerResult & { updatedAtUtc: string }) | undefined> {
    const [row] = await this.db.all<Record<string, string | number>>(
      'SELECT * FROM stat_cache WHERE queryHash = ?',
      [hash]
    );
    if (!row) return;
    try {
      const parsed = workerResultSchema.parse({
        result: JSON.parse(String(row.resultJson)),
        calculatorVersion: row.calculatorVersion,
        computeMs: row.computeMs,
        calculatedAsOfUtc: row.calculatedAsOfUtc,
        latestPlayedMatch: JSON.parse(String(row.latestPlayedMatchJson)),
        sourceMarker: JSON.parse(String(row.sourceMarkerJson)),
        selectedTournamentKeys: JSON.parse(
          String(row.selectedTournamentKeysJson)
        )
      });
      assertJson(parsed);
      if (parsed.result.status !== 'ok' || parsed.result.quality === 'degraded')
        return;
      await this.db.run(
        'UPDATE stat_cache SET lastAccessedAtUtc = ? WHERE queryHash = ?',
        [new Date().toISOString(), hash]
      );
      return { ...parsed, updatedAtUtc: String(row.updatedAtUtc) };
    } catch {
      return;
    }
  }
  async put(
    hash: string,
    query: StatsQuery,
    definition: StatDefinition,
    value: WorkerResult
  ) {
    assertJson(value);
    const validated = workerResultSchema.parse(value);
    if (
      validated.result.status !== 'ok' ||
      validated.result.quality === 'degraded'
    )
      return false;
    definition.resultSchema.parse(validated.result);
    const now = new Date().toISOString(),
      row = {
        queryHash: hash,
        normalizedQueryJson: canonicalJson(query),
        statSlug: definition.slug,
        catalogueId: definition.catalogueId,
        eventKey: query.eventKey,
        calculatorVersion: validated.calculatorVersion,
        resultJson: canonicalJson(validated.result),
        computeMs: validated.computeMs,
        calculatedAsOfUtc: validated.calculatedAsOfUtc,
        latestPlayedMatchJson: canonicalJson(validated.latestPlayedMatch),
        sourceMarkerJson: canonicalJson(validated.sourceMarker),
        selectedTournamentKeysJson: canonicalJson(
          validated.selectedTournamentKeys
        ),
        quality: validated.result.quality,
        warningsJson: canonicalJson(validated.result.warnings),
        createdAtUtc: now,
        updatedAtUtc: now,
        lastAccessedAtUtc: now
      };
    const columns = Object.keys(row);
    await this.db.run(
      'INSERT INTO stat_cache (' +
        columns.join(',') +
        ') VALUES (' +
        columns.map(() => '?').join(',') +
        ') ON CONFLICT(queryHash) DO UPDATE SET ' +
        columns
          .filter((k) => k !== 'queryHash' && k !== 'createdAtUtc')
          .map((k) => k + '=excluded.' + k)
          .join(','),
      Object.values(row)
    );
    await this.retain();
    return true;
  }
  async retain() {
    await this.db.run(
      'DELETE FROM stat_cache WHERE queryHash IN (SELECT queryHash FROM stat_cache ORDER BY lastAccessedAtUtc DESC, updatedAtUtc DESC, queryHash LIMIT -1 OFFSET ?)',
      [this.limit]
    );
  }
  close() {
    return this.db.close();
  }
}
