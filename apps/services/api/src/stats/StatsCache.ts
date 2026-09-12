import { AsyncDatabase } from 'promised-sqlite3';
import sqlite3 from 'sqlite3';
import {
  canonicalJson,
  queryHash,
  type StatsQuery,
  type StatDefinition
} from '@toa-lib/models/seasons/stats';
import { StatsDatabase } from './StatsDatabase.js';
import { StatsWorkerPool } from './StatsWorkerPool.js';
import { readSourceMarker, type StatsWork } from './EventStatsSnapshot.js';
import type { WorkerResult } from './StatsSchemas.js';
export class StatsCache {
  private flights = new Map<string, Promise<WorkerResult>>();
  constructor(
    readonly pool: StatsWorkerPool,
    readonly database: StatsDatabase,
    private sourcePath: string,
    private globalPath: string,
    private onError: (e: unknown) => void = () => {}
  ) {}
  async drain() {
    await Promise.allSettled([...this.flights.values()]);
  }
  async query(
    query: StatsQuery,
    definition: StatDefinition,
    seasonKey: string,
    refresh = false,
    awaitFresh = false
  ) {
    const hash = queryHash(query),
      cached = await this.database.get(hash);
    let marker;
    try {
      const source = await AsyncDatabase.open(
        this.sourcePath,
        sqlite3.OPEN_READONLY
      );
      try {
        marker = await readSourceMarker(source, query);
      } finally {
        await source.close();
      }
    } catch (error) {
      if (!cached) throw error;
      this.onError(error);
    }
    const stale =
      refresh ||
      !cached ||
      cached.calculatorVersion !== definition.version ||
      marker === undefined ||
      canonicalJson(marker) !== canonicalJson(cached.sourceMarker);
    const work: StatsWork = {
      query,
      queryHash: hash,
      seasonKey,
      calculatorVersion: definition.version,
      eventDatabasePath: this.sourcePath,
      globalDatabasePath: this.globalPath
    };
    const enqueue = () => {
      const existing = this.flights.get(hash);
      if (existing) {
        this.pool.join(hash, !cached || awaitFresh);
        return existing;
      }
      const pending = this.pool
        .enqueue(
          work,
          refresh ? 'explicit-refresh' : cached ? 'stale-refresh' : 'cold-miss',
          !cached || awaitFresh
        )
        .then(async (result) => {
          await this.database.put(hash, query, definition, result);
          return result;
        })
        .finally(() => this.flights.delete(hash));
      this.flights.set(hash, pending);
      return pending;
    };
    if (cached && !awaitFresh) {
      let refreshQueued = false;
      if (stale) {
        const queued = enqueue();
        refreshQueued =
          this.pool.inspect().queued.some((j) => j.queryHash === hash) ||
          this.pool.inspect().running.some((j) => j.queryHash === hash);
        void queued.catch(this.onError);
      }
      const { updatedAtUtc, ...value } = cached;
      return {
        ...value,
        normalizedQuery: query,
        cache: stale ? ('stale' as const) : ('fresh' as const),
        refreshQueued,
        waitedForWorker: false,
        cacheAgeMs: Math.max(0, Date.now() - Date.parse(updatedAtUtc))
      };
    }
    const result = await enqueue();
    return {
      ...result,
      normalizedQuery: query,
      cache: cached ? ('fresh' as const) : ('miss' as const),
      refreshQueued: false,
      waitedForWorker: true,
      cacheAgeMs: 0
    };
  }

  /** Resolve an actual completed calculation, never the stale-while-refresh value. */
  queryFresh(query: StatsQuery, definition: StatDefinition, seasonKey: string) {
    return this.query(query, definition, seasonKey, true, true);
  }
}
