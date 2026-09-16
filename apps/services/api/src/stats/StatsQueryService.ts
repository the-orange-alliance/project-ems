import type { FastifyInstance } from 'fastify';
import { join, resolve } from 'node:path';
import { AsyncDatabase } from 'promised-sqlite3';
import sqlite3 from 'sqlite3';
import { getAppData } from '@toa-lib/server';
import {
  catalogueMetadata,
  normalizeQuery,
  registryForSeason
} from '@toa-lib/models/seasons/stats';
import { StatsCache } from './StatsCache.js';
import { StatsDatabase } from './StatsDatabase.js';
import { eventParams, queryBody } from './StatsSchemas.js';
import { StatsServiceError, StatsWorkerPool } from './StatsWorkerPool.js';

export interface StatsQueryServiceOptions {
  databaseRoot?: string;
  pool?: StatsWorkerPool;
  cacheLimit?: number;
  onRefreshError?: (error: unknown) => void;
}

export type StatsQueryResponse = Awaited<ReturnType<StatsCache['query']>>;

/** Application-owned query orchestration shared by HTTP and server playback. */
export class StatsQueryService {
  readonly pool: StatsWorkerPool;
  readonly databaseRoot: string;
  private readonly globalPath: string;
  private readonly caches = new Map<
    string,
    Promise<{ cache: StatsCache; database: StatsDatabase }>
  >();
  private closing?: Promise<void>;

  constructor(private readonly options: StatsQueryServiceOptions = {}) {
    this.databaseRoot = options.databaseRoot ?? getAppData('ems');
    this.globalPath = join(this.databaseRoot, 'global.db');
    this.pool = options.pool ?? new StatsWorkerPool();
  }

  assertCompatibleOptions(options: StatsQueryServiceOptions) {
    if (
      (options.pool && options.pool !== this.pool) ||
      (options.databaseRoot &&
        resolve(options.databaseRoot) !== resolve(this.databaseRoot)) ||
      (options.cacheLimit !== undefined &&
        options.cacheLimit !== this.options.cacheLimit) ||
      (options.onRefreshError &&
        options.onRefreshError !== this.options.onRefreshError)
    )
      throw new Error(
        'Statistics service already initialized with different dependencies'
      );
  }

  private assertOpen() {
    if (this.closing)
      throw new StatsServiceError(503, 'Statistics service is shutting down');
  }

  async resolveEvent(eventKey: string): Promise<string> {
    this.assertOpen();
    if (!eventParams.safeParse({ eventKey }).success)
      throw new StatsServiceError(400, 'Invalid event key');
    const database = await AsyncDatabase.open(
      this.globalPath,
      sqlite3.OPEN_READONLY
    );
    try {
      const [row] = await database.all<{ seasonKey: string }>(
        'SELECT seasonKey FROM event WHERE eventKey = ?',
        [eventKey]
      );
      if (!row || typeof row.seasonKey !== 'string')
        throw new StatsServiceError(404, 'Event does not exist');
      return row.seasonKey;
    } finally {
      await database.close();
    }
  }

  async catalogue(eventKey: string) {
    return catalogueMetadata(await this.resolveEvent(eventKey));
  }

  private cacheFor(eventKey: string) {
    this.assertOpen();
    let pending = this.caches.get(eventKey);
    if (!pending) {
      pending = StatsDatabase.open(
        join(this.databaseRoot, eventKey + '.stats.db'),
        this.options.cacheLimit
      )
        .then((database) => ({
          database,
          cache: new StatsCache(
            this.pool,
            database,
            join(this.databaseRoot, eventKey + '.db'),
            this.globalPath,
            this.options.onRefreshError
          )
        }))
        .catch((error) => {
          this.caches.delete(eventKey);
          throw error;
        });
      this.caches.set(eventKey, pending);
    }
    return pending;
  }

  private async prepare(eventKey: string, input: unknown) {
    const parsed = queryBody.safeParse(input);
    if (!parsed.success) throw new StatsServiceError(400, parsed.error.message);
    const seasonKey = await this.resolveEvent(eventKey);
    const definition = registryForSeason(seasonKey).find(
      (item) => item.slug === parsed.data.stat.trim().toLowerCase()
    );
    if (!definition)
      throw new StatsServiceError(
        404,
        'Calculator is unavailable for this event season'
      );
    const { refresh, ...body } = parsed.data;
    let query;
    try {
      query = normalizeQuery({ ...body, eventKey }, definition);
    } catch (error) {
      throw new StatsServiceError(
        400,
        error instanceof Error ? error.message : 'Invalid statistics query'
      );
    }
    const { cache } = await this.cacheFor(eventKey);
    return { cache, query, definition, seasonKey, refresh };
  }

  /** Preserve stale-while-refresh semantics used by the existing Stats HTTP API. */
  async query(eventKey: string, input: unknown): Promise<StatsQueryResponse> {
    const { cache, query, definition, seasonKey, refresh } = await this.prepare(
      eventKey,
      input
    );
    return cache.query(query, definition, seasonKey, refresh);
  }

  /** Force or join one worker flight and await its result, including failures/non-ok results. */
  async queryFresh(
    eventKey: string,
    input: unknown
  ): Promise<StatsQueryResponse> {
    const { cache, query, definition, seasonKey } = await this.prepare(
      eventKey,
      input
    );
    return cache.queryFresh(query, definition, seasonKey);
  }

  /**
   * For authoritative cue preparation. Never stale, never a forced recompute:
   * a genuinely fresh cached entry (e.g. warmed while On Deck) is returned with
   * no worker run; a missing entry or one whose source marker or calculator
   * version moved blocks on a real calculation.
   */
  async queryReady(
    eventKey: string,
    input: unknown
  ): Promise<StatsQueryResponse> {
    const { cache, query, definition, seasonKey } = await this.prepare(
      eventKey,
      input
    );
    return cache.queryReady(query, definition, seasonKey);
  }

  close(): Promise<void> {
    this.closing ??= (async () => {
      // Closing the pool bounds shutdown and rejects queued work; drain cache writes afterward.
      await this.pool.close();
      const entries = await Promise.allSettled([...this.caches.values()]);
      await Promise.all(
        entries.map(async (entry) => {
          if (entry.status === 'fulfilled') {
            await entry.value.cache.drain();
            await entry.value.database.close();
          }
        })
      );
      this.caches.clear();
    })();
    return this.closing;
  }
}

// Fastify plugins are encapsulated, but their HTTP server is shared. Never share across apps/tests.
const services = new WeakMap<FastifyInstance['server'], StatsQueryService>();

export function getStatsQueryService(
  app: FastifyInstance,
  options: StatsQueryServiceOptions = {}
): StatsQueryService {
  const existing = services.get(app.server);
  if (existing) {
    existing.assertCompatibleOptions(options);
    return existing;
  }
  const service = new StatsQueryService({
    ...options,
    onRefreshError:
      options.onRefreshError ??
      ((error) =>
        app.log.warn(
          { err: error },
          'Statistics refresh failed; previous cache retained'
        ))
  });
  services.set(app.server, service);
  app.addHook('onClose', async () => {
    await service.close();
    services.delete(app.server);
  });
  return service;
}
