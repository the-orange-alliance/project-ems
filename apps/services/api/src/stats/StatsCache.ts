import { AsyncDatabase } from 'promised-sqlite3';
import sqlite3 from 'sqlite3';
import {
  canonicalJson,
  type StatsQuery,
  type StatDefinition
} from '@toa-lib/models/seasons/stats';
import { queryHash } from '@toa-lib/models/seasons/stats/query-hash';
import { StatsDatabase } from './StatsDatabase.js';
import { StatsWorkerPool } from './StatsWorkerPool.js';
import { readSourceMarker, type StatsWork } from './EventStatsSnapshot.js';
import { sourceRevisions } from './SourceRevisions.js';
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
    // Source marker = SQL fingerprint of match / history / action tables plus
    // the in-memory ranking and alliance revisions (no reads). Captured before
    // the SQL read and stored with any result computed from here, so a write
    // landing mid-calculation leaves the stored entry stale, never fresh.
    // Teams and global fcs_settings are deliberately not fingerprinted:
    // accepted staleness, see SourceRevisions.ts.
    const revisions = sourceRevisions(),
      hash = queryHash(query),
      cached = await this.database.get(hash);
    let marker;
    try {
      const source = await AsyncDatabase.open(
        this.sourcePath,
        sqlite3.OPEN_READONLY
      );
      try {
        marker = { ...(await readSourceMarker(source, query)), ...revisions };
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
        .then(async (workerResult) => {
          const result = {
            ...workerResult,
            sourceMarker: { ...workerResult.sourceMarker, ...revisions }
          };
          await this.database.put(hash, query, definition, result);
          return result;
        })
        .finally(() => this.flights.delete(hash));
      this.flights.set(hash, pending);
      return pending;
    };
    // Stale-while-refresh returns any cached value; an awaiting caller only
    // accepts a cached value that is genuinely fresh (refresh forces stale).
    if (cached && (!awaitFresh || !stale)) {
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
    const joined = this.flights.has(hash);
    let result = await enqueue();
    // A joined flight may have started before this request observed its
    // marker (e.g. a warm running when rankings changed): its data can predate
    // what this caller must see, so calculate once more rather than return it.
    if (
      joined &&
      canonicalJson(result.sourceMarker) !== canonicalJson(marker ?? null)
    )
      result = await enqueue();
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

  /**
   * Never stale, never a forced recompute: returns a cached entry only when it
   * is genuinely fresh (same calculator version and source marker, no worker
   * run), otherwise starts or joins a worker flight and awaits its result.
   */
  queryReady(query: StatsQuery, definition: StatDefinition, seasonKey: string) {
    return this.query(query, definition, seasonKey, false, true);
  }
}
