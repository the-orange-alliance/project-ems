import {
  createEmptyPlaybackState,
  graphicIdentifierZod,
  graphicRevisionZod,
  migrateTimeline,
  versionedTimelineZod,
  rundownZod,
  playbackStateZod,
  playbackAcknowledgmentZod,
  PRODUCER_SHOW_RUNDOWN_ID,
  emptyProducerShow,
  queueEntriesFromShow,
  type VersionedTimeline,
  type Rundown,
  type PlaybackState,
  type PlaybackAcknowledgment,
  type CueQueue
} from '@toa-lib/models';
import { getAppData } from '@toa-lib/server';
import { AsyncDatabase } from 'promised-sqlite3';
import sqlite3 from 'sqlite3';
import { join } from 'node:path';
import { z } from 'zod';
import { migrateGraphicsDatabase } from './GraphicsSchema.js';
import logger from '../util/Logger.js';

export class GraphicsRepositoryError extends Error {
  constructor(
    readonly statusCode: 400 | 404 | 409 | 500 | 503,
    readonly code:
      | 'INVALID_INPUT'
      | 'NOT_FOUND'
      | 'CONFLICT'
      | 'CORRUPT_DATA'
      | 'UNAVAILABLE',
    message: string
  ) {
    super(message);
  }
}
export interface GraphicsRepositoryOptions {
  databaseRoot?: string;
}
export type TimelineCreate = Omit<
  VersionedTimeline,
  'schemaVersion' | 'revision' | 'updatedAtUtc' | 'eventKey'
> & { eventKey?: string };
export type TimelinePatch = Partial<
  Pick<
    VersionedTimeline,
    'name' | 'description' | 'items' | 'variables' | 'published'
  >
> & { sortOrder?: number };
export type RundownCreate = Omit<
  Rundown,
  'schemaVersion' | 'revision' | 'updatedAtUtc' | 'eventKey'
> & { eventKey?: string };
export type RundownPatch = Partial<Pick<Rundown, 'name' | 'entries'>>;
export interface GraphicsCommandRecord {
  requestId: string;
  fingerprint: string;
  acknowledgment: PlaybackAcknowledgment;
}
interface TimelineRow {
  timelineId: string;
  eventKey: string;
  name: string;
  description: string | null;
  data: string;
  sortOrder: number;
  updatedAtUtc: string | null;
  schemaVersion: number;
  revision: number;
}
interface StoredRow {
  data: string;
  revision: number;
}

const notFound = (name: string) =>
  new GraphicsRepositoryError(404, 'NOT_FOUND', `${name} does not exist`);
const conflict = (message: string) =>
  new GraphicsRepositoryError(409, 'CONFLICT', message);
function parseStored<T>(description: string, parse: () => T): T {
  try {
    return parse();
  } catch {
    throw new GraphicsRepositoryError(
      409,
      'CORRUPT_DATA',
      `${description} is corrupt or uses an unsupported schema; stored content was preserved`
    );
  }
}
/**
 * Read-only degrade: a corrupt row must not block a producer mid-show, so a pure read (list/load)
 * logs a warning naming the event and row and returns the empty equivalent with 200 instead of
 * throwing CORRUPT_DATA. Never call this from a write path - persisting known-bad data (e.g.
 * merging a patch onto unreadable content, or checking a revision to allow an overwrite) is
 * different from tolerating it on read, and must keep throwing via parseStored directly.
 */
function degradeCorruptOnRead<T>(
  eventKey: string,
  rowId: string,
  description: string,
  parse: () => T,
  empty: () => T
): T {
  try {
    return parseStored(description, parse);
  } catch (error) {
    if (
      !(error instanceof GraphicsRepositoryError) ||
      error.code !== 'CORRUPT_DATA'
    )
      throw error;
    logger.warn(
      `Graphics: ${description} (event=${eventKey}, row=${rowId}) is corrupt or uses an unsupported schema; degrading to an empty result instead of failing the read.`
    );
    return empty();
  }
}
function timelineFromRow(row: TimelineRow): VersionedTimeline {
  return parseStored(`Timeline ${row.timelineId}`, () => {
    const payload = JSON.parse(row.data);
    if (row.schemaVersion === 1) {
      // Legacy format stores only the item array. Migration is explicit and keeps IDs.
      return migrateTimeline({
        timelineId: row.timelineId,
        eventKey: row.eventKey,
        name: row.name,
        description: row.description ?? undefined,
        items: payload,
        updatedAtUtc: row.updatedAtUtc ?? new Date(0).toISOString()
      });
    }
    if (row.schemaVersion !== 2) throw new Error('Unsupported schema version');
    const value = versionedTimelineZod.parse(payload);
    if (
      value.eventKey !== row.eventKey ||
      value.timelineId !== row.timelineId ||
      value.revision !== row.revision
    )
      throw new Error('Stored identity or revision mismatch');
    return value;
  });
}
/** Read-only variant of timelineFromRow: a corrupt row degrades to items: [] instead of throwing. */
function readTimelineFromRow(row: TimelineRow): VersionedTimeline {
  return degradeCorruptOnRead(
    row.eventKey,
    row.timelineId,
    `Timeline ${row.timelineId}`,
    () => timelineFromRow(row),
    () => ({
      schemaVersion: 2,
      revision: row.revision,
      timelineId: row.timelineId,
      eventKey: row.eventKey,
      name: row.name,
      description: row.description ?? undefined,
      items: [],
      updatedAtUtc: row.updatedAtUtc ?? new Date(0).toISOString()
    })
  );
}

/** Short, isolated SQLite transactions. No connections or transactions are shared with match writes. */
export class GraphicsRepository {
  readonly databaseRoot: string;
  constructor(options: GraphicsRepositoryOptions = {}) {
    this.databaseRoot = options.databaseRoot ?? getAppData('ems');
  }
  private async transaction<T>(
    eventKey: string,
    work: (db: AsyncDatabase) => Promise<T>
  ): Promise<T> {
    try {
      graphicIdentifierZod.parse(eventKey);
      if (eventKey === 'global') throw notFound('Event');
      const global = await AsyncDatabase.open(
        join(this.databaseRoot, 'global.db'),
        sqlite3.OPEN_READONLY
      );
      try {
        const [event] = await global.all(
          'SELECT eventKey FROM event WHERE eventKey = ?',
          [eventKey]
        );
        if (!event) throw notFound('Event');
      } finally {
        await global.close();
      }
      // OPEN_READWRITE deliberately omits OPEN_CREATE: invalid/missing events cannot create files.
      const db = await AsyncDatabase.open(
        join(this.databaseRoot, `${eventKey}.db`),
        sqlite3.OPEN_READWRITE
      );
      try {
        await db.exec(
          'PRAGMA busy_timeout=5000; PRAGMA synchronous=NORMAL; BEGIN IMMEDIATE'
        );
        try {
          await migrateGraphicsDatabase(db);
          const value = await work(db);
          await db.exec('COMMIT');
          return value;
        } catch (error) {
          await db.exec('ROLLBACK').catch(() => {});
          throw error;
        }
      } finally {
        await db.close();
      }
    } catch (error) {
      if (error instanceof GraphicsRepositoryError) throw error;
      if (error instanceof z.ZodError)
        throw new GraphicsRepositoryError(
          400,
          'INVALID_INPUT',
          error.issues.map((i) => i.message).join('; ')
        );
      throw new GraphicsRepositoryError(
        503,
        'UNAVAILABLE',
        'Graphics storage is unavailable'
      );
    }
  }
  private async timeline(
    db: AsyncDatabase,
    eventKey: string,
    id: string
  ): Promise<TimelineRow> {
    graphicIdentifierZod.parse(id);
    const [row] = await db.all<TimelineRow>(
      'SELECT * FROM graphics_timeline WHERE eventKey=? AND timelineId=?',
      [eventKey, id]
    );
    if (!row) throw notFound('Timeline');
    return row;
  }
  private async writeTimeline(
    db: AsyncDatabase,
    value: VersionedTimeline,
    sortOrder: number
  ): Promise<void> {
    await db.run(
      `UPDATE graphics_timeline SET name=?,description=?,data=?,sortOrder=?,updatedAtUtc=?,schemaVersion=2,revision=?
      WHERE eventKey=? AND timelineId=?`,
      [
        value.name,
        value.description ?? null,
        JSON.stringify(value),
        sortOrder,
        value.updatedAtUtc,
        value.revision,
        value.eventKey,
        value.timelineId
      ]
    );
  }
  /** `options.published`, when given, filters to timelines whose `published` flag matches (missing/false counts as unpublished). */
  listTimelines(
    eventKey: string,
    options: { published?: boolean } = {}
  ): Promise<VersionedTimeline[]> {
    return this.transaction(eventKey, async (db) => {
      const rows = (
        await db.all<TimelineRow>(
          'SELECT * FROM graphics_timeline WHERE eventKey=? ORDER BY sortOrder,name,timelineId',
          [eventKey]
        )
      ).map(readTimelineFromRow);
      return options.published === undefined
        ? rows
        : rows.filter((t) => Boolean(t.published) === options.published);
    });
  }
  loadTimeline(eventKey: string, id: string): Promise<VersionedTimeline> {
    return this.transaction(eventKey, async (db) =>
      readTimelineFromRow(await this.timeline(db, eventKey, id))
    );
  }
  createTimeline(
    eventKey: string,
    input: TimelineCreate
  ): Promise<VersionedTimeline> {
    return this.transaction(eventKey, async (db) => {
      if (input.eventKey !== undefined && input.eventKey !== eventKey)
        throw new GraphicsRepositoryError(
          400,
          'INVALID_INPUT',
          'Body eventKey must match the route'
        );
      const value = versionedTimelineZod.parse({
        ...input,
        eventKey,
        schemaVersion: 2,
        revision: 0,
        updatedAtUtc: new Date().toISOString()
      });
      const [existing] = await db.all(
        'SELECT timelineId FROM graphics_timeline WHERE eventKey=? AND timelineId=?',
        [eventKey, value.timelineId]
      );
      if (existing) throw conflict('Timeline already exists');
      await db.run(
        `INSERT INTO graphics_timeline(timelineId,eventKey,name,description,data,sortOrder,updatedAtUtc,schemaVersion,revision)
        VALUES(?,?,?,?,?,0,?,2,0)`,
        [
          value.timelineId,
          eventKey,
          value.name,
          value.description ?? null,
          JSON.stringify(value),
          value.updatedAtUtc
        ]
      );
      return value;
    });
  }
  updateTimeline(
    eventKey: string,
    id: string,
    patch: TimelinePatch,
    expectedRevision: number
  ): Promise<VersionedTimeline> {
    return this.transaction(eventKey, async (db) => {
      graphicRevisionZod.parse(expectedRevision);
      const row = await this.timeline(db, eventKey, id),
        current = timelineFromRow(row);
      if (current.revision !== expectedRevision)
        throw conflict('Timeline revision changed; reload before saving');
      const { sortOrder, ...fields } = patch;
      if (sortOrder !== undefined) z.number().int().safe().parse(sortOrder);
      const value = versionedTimelineZod.parse({
        ...current,
        ...fields,
        revision: current.revision + 1,
        updatedAtUtc: new Date().toISOString()
      });
      await this.writeTimeline(db, value, sortOrder ?? row.sortOrder);
      return value;
    });
  }
  deleteTimeline(
    eventKey: string,
    id: string,
    expectedRevision: number
  ): Promise<void> {
    return this.transaction(eventKey, async (db) => {
      graphicRevisionZod.parse(expectedRevision);
      const current = timelineFromRow(await this.timeline(db, eventKey, id));
      if (current.revision !== expectedRevision)
        throw conflict('Timeline revision changed; reload before deleting');
      await db.run(
        'DELETE FROM graphics_timeline WHERE eventKey=? AND timelineId=?',
        [eventKey, id]
      );
    });
  }
  private async rundownRow(
    db: AsyncDatabase,
    eventKey: string,
    id: string
  ): Promise<StoredRow> {
    graphicIdentifierZod.parse(id);
    const [row] = await db.all<StoredRow>(
      'SELECT data,revision FROM graphics_rundown WHERE eventKey=? AND rundownId=?',
      [eventKey, id]
    );
    if (!row) throw notFound('Rundown');
    return row;
  }
  private rundownFromRow(
    row: StoredRow,
    eventKey: string,
    id: string
  ): Rundown {
    return parseStored(`Rundown ${id}`, () => {
      const value = rundownZod.parse(JSON.parse(row.data));
      if (
        value.eventKey !== eventKey ||
        value.rundownId !== id ||
        value.revision !== row.revision
      )
        throw new Error('Identity mismatch');
      return value;
    });
  }
  private async rundown(
    db: AsyncDatabase,
    eventKey: string,
    id: string
  ): Promise<Rundown> {
    return this.rundownFromRow(
      await this.rundownRow(db, eventKey, id),
      eventKey,
      id
    );
  }
  /** Read-only variant: a corrupt rundown row degrades to entries: [] instead of throwing. */
  private async readRundown(
    db: AsyncDatabase,
    eventKey: string,
    id: string
  ): Promise<Rundown> {
    const row = await this.rundownRow(db, eventKey, id);
    return degradeCorruptOnRead(
      eventKey,
      id,
      `Rundown ${id}`,
      () => this.rundownFromRow(row, eventKey, id),
      () => ({
        schemaVersion: 2,
        revision: row.revision,
        rundownId: id,
        eventKey,
        name: '',
        entries: [],
        updatedAtUtc: new Date(0).toISOString()
      })
    );
  }
  /**
   * Entry ids must be unique; entry `timelineId`s are deliberately NOT checked
   * against the event's timelines.
   *
   * Requiring the referenced timeline to exist made a deleted timeline poison
   * the whole document: every later reorder and every attempt to remove the
   * offending entry 404'd, so the only way out was discarding operator-authored
   * show order. A dangling reference is instead a first-class, reportable entry
   * state (`missing-timeline`, see `describeRundownEntries`) that the producer
   * can see and fix. Cueing still refuses it - `load-rundown` rejects the load
   * naming the entry - so nothing broken reaches air.
   */
  private checkRundown(value: Rundown): void {
    if (
      new Set(value.entries.map((e) => e.entryId)).size !== value.entries.length
    )
      throw new GraphicsRepositoryError(
        400,
        'INVALID_INPUT',
        'Rundown entry IDs must be unique'
      );
  }
  listRundowns(eventKey: string): Promise<Rundown[]> {
    return this.transaction(eventKey, async (db) => {
      const rows = await db.all<{ rundownId: string }>(
        'SELECT rundownId FROM graphics_rundown WHERE eventKey=? ORDER BY rundownId',
        [eventKey]
      );
      return Promise.all(
        rows.map((row) => this.readRundown(db, eventKey, row.rundownId))
      );
    });
  }
  loadRundown(eventKey: string, id: string): Promise<Rundown> {
    return this.transaction(eventKey, (db) =>
      this.readRundown(db, eventKey, id)
    );
  }
  createRundown(eventKey: string, input: RundownCreate): Promise<Rundown> {
    return this.transaction(eventKey, async (db) => {
      if (input.eventKey !== undefined && input.eventKey !== eventKey)
        throw new GraphicsRepositoryError(
          400,
          'INVALID_INPUT',
          'Body eventKey must match the route'
        );
      const value = rundownZod.parse({
        ...input,
        eventKey,
        schemaVersion: 2,
        revision: 0,
        updatedAtUtc: new Date().toISOString()
      });
      const [exists] = await db.all(
        'SELECT rundownId FROM graphics_rundown WHERE eventKey=? AND rundownId=?',
        [eventKey, value.rundownId]
      );
      if (exists) throw conflict('Rundown already exists');
      this.checkRundown(value);
      await db.run(
        'INSERT INTO graphics_rundown(eventKey,rundownId,data,revision) VALUES(?,?,?,0)',
        [eventKey, value.rundownId, JSON.stringify(value)]
      );
      return value;
    });
  }
  updateRundown(
    eventKey: string,
    id: string,
    patch: RundownPatch,
    expectedRevision: number
  ): Promise<Rundown> {
    return this.transaction(eventKey, async (db) => {
      graphicRevisionZod.parse(expectedRevision);
      const current = await this.rundown(db, eventKey, id);
      if (current.revision !== expectedRevision)
        throw conflict('Rundown revision changed; reload before saving');
      const value = rundownZod.parse({
        ...current,
        ...patch,
        revision: current.revision + 1,
        updatedAtUtc: new Date().toISOString()
      });
      this.checkRundown(value);
      await db.run(
        'UPDATE graphics_rundown SET data=?,revision=? WHERE eventKey=? AND rundownId=?',
        [JSON.stringify(value), value.revision, eventKey, id]
      );
      return value;
    });
  }
  deleteRundown(
    eventKey: string,
    id: string,
    expectedRevision: number
  ): Promise<void> {
    return this.transaction(eventKey, async (db) => {
      graphicRevisionZod.parse(expectedRevision);
      if ((await this.rundown(db, eventKey, id)).revision !== expectedRevision)
        throw conflict('Rundown revision changed; reload before deleting');
      await db.run(
        'DELETE FROM graphics_rundown WHERE eventKey=? AND rundownId=?',
        [eventKey, id]
      );
    });
  }
  private async playbackRow(
    db: AsyncDatabase,
    eventKey: string
  ): Promise<StoredRow | undefined> {
    const [row] = await db.all<StoredRow>(
      'SELECT data,revision FROM graphics_playback WHERE eventKey=?',
      [eventKey]
    );
    return row;
  }
  private playbackFromRow(row: StoredRow, eventKey: string): PlaybackState {
    return parseStored('Playback state', () => {
      const value = playbackStateZod.parse(JSON.parse(row.data));
      if (value.eventKey !== eventKey || value.revision !== row.revision)
        throw new Error('Identity mismatch');
      return value;
    });
  }
  private async playback(
    db: AsyncDatabase,
    eventKey: string
  ): Promise<PlaybackState> {
    const row = await this.playbackRow(db, eventKey);
    if (!row) return createEmptyPlaybackState(eventKey);
    return this.playbackFromRow(row, eventKey);
  }
  loadPlayback(eventKey: string): Promise<PlaybackState> {
    return this.transaction(eventKey, async (db) => {
      const row = await this.playbackRow(db, eventKey);
      if (!row) return createEmptyPlaybackState(eventKey);
      // Read-only: a corrupt playback row degrades to an empty state instead of throwing.
      return degradeCorruptOnRead(
        eventKey,
        eventKey,
        'Playback state',
        () => this.playbackFromRow(row, eventKey),
        () => createEmptyPlaybackState(eventKey)
      );
    });
  }
  private async command(
    db: AsyncDatabase,
    eventKey: string,
    requestId: string
  ): Promise<GraphicsCommandRecord | null> {
    graphicIdentifierZod.parse(requestId);
    const [row] = await db.all<{ fingerprint: string; acknowledgment: string }>(
      'SELECT fingerprint,acknowledgment FROM graphics_command WHERE eventKey=? AND requestId=?',
      [eventKey, requestId]
    );
    if (!row) return null;
    return parseStored('Command acknowledgment', () => {
      const acknowledgment = playbackAcknowledgmentZod.parse(
        JSON.parse(row.acknowledgment)
      );
      if (
        acknowledgment.requestId !== requestId ||
        (acknowledgment.state && acknowledgment.state.eventKey !== eventKey)
      )
        throw new Error('Identity mismatch');
      return { requestId, fingerprint: row.fingerprint, acknowledgment };
    });
  }
  loadCommand(
    eventKey: string,
    requestId: string
  ): Promise<GraphicsCommandRecord | null> {
    return this.transaction(eventKey, (db) =>
      this.command(db, eventKey, requestId)
    );
  }
  /** Command records are intentionally retained indefinitely: an old request ID must never execute again. */
  savePlayback(
    eventKey: string,
    state: PlaybackState,
    expectedRevision: number,
    command?: GraphicsCommandRecord
  ): Promise<PlaybackState> {
    return this.transaction(eventKey, async (db) => {
      graphicRevisionZod.parse(expectedRevision);
      const value = playbackStateZod.parse(state);
      if (
        value.eventKey !== eventKey ||
        value.revision !== expectedRevision + 1
      )
        throw new GraphicsRepositoryError(
          400,
          'INVALID_INPUT',
          'Playback event/revision does not match the write target'
        );
      const current = await this.playback(db, eventKey);
      if (current.revision !== expectedRevision)
        throw conflict('Playback revision changed');
      if (command) {
        graphicIdentifierZod.parse(command.requestId);
        z.string().min(1).max(1000000).parse(command.fingerprint);
        const acknowledgment = playbackAcknowledgmentZod.parse(
          command.acknowledgment
        );
        if (
          acknowledgment.requestId !== command.requestId ||
          (acknowledgment.state &&
            JSON.stringify(acknowledgment.state) !== JSON.stringify(value))
        )
          throw new GraphicsRepositoryError(
            400,
            'INVALID_INPUT',
            'Acknowledgment must describe the committed state'
          );
        if (await this.command(db, eventKey, command.requestId))
          throw conflict('Command already recorded; replay its acknowledgment');
        await db.run(
          'INSERT INTO graphics_command(eventKey,requestId,fingerprint,acknowledgment) VALUES(?,?,?,?)',
          [
            eventKey,
            command.requestId,
            command.fingerprint,
            JSON.stringify(acknowledgment)
          ]
        );
      }
      await db.run(
        `INSERT INTO graphics_playback(eventKey,data,revision) VALUES(?,?,?)
        ON CONFLICT(eventKey) DO UPDATE SET data=excluded.data,revision=excluded.revision`,
        [eventKey, JSON.stringify(value), value.revision]
      );
      return value;
    });
  }
  /**
   * Idempotently returns the event's producer-show rundown, creating the empty
   * document on first read.
   *
   * The producer app needs a revision to write against before it can add its
   * first entry, so the show has to exist as a row rather than as an implied
   * empty value; creating it here keeps that a single round trip and makes
   * "the show exists" true for every event the moment anyone looks at it. The
   * create is conditional inside the same transaction, so two concurrent first
   * reads cannot produce two documents or bump a revision.
   */
  loadProducerShow(eventKey: string): Promise<Rundown> {
    return this.transaction(eventKey, async (db) => {
      const [row] = await db.all<StoredRow>(
        'SELECT data,revision FROM graphics_rundown WHERE eventKey=? AND rundownId=?',
        [eventKey, PRODUCER_SHOW_RUNDOWN_ID]
      );
      if (row)
        return degradeCorruptOnRead(
          eventKey,
          PRODUCER_SHOW_RUNDOWN_ID,
          `Rundown ${PRODUCER_SHOW_RUNDOWN_ID}`,
          () => this.rundownFromRow(row, eventKey, PRODUCER_SHOW_RUNDOWN_ID),
          () => emptyProducerShow(eventKey, new Date(0).toISOString())
        );
      const value = emptyProducerShow(eventKey, new Date().toISOString());
      await db.run(
        'INSERT INTO graphics_rundown(eventKey,rundownId,data,revision) VALUES(?,?,?,0)',
        [eventKey, PRODUCER_SHOW_RUNDOWN_ID, JSON.stringify(value)]
      );
      return value;
    });
  }
  /**
   * @deprecated Read compatibility only, for `GET /graphics/:eventKey/queue`.
   * Projects the producer-show rundown - the one durable owner of show order -
   * into the retired `CueQueue` shape. There is deliberately no write
   * counterpart: the legacy `PUT` is gone, so nothing can resurrect a stale
   * full-array snapshot behind the rundown's revision. Removed in Task 16
   * along with the route, `graphics_queue`, and the `CueQueue` model.
   */
  async loadQueue(eventKey: string): Promise<CueQueue> {
    const show = await this.loadProducerShow(eventKey);
    return {
      eventKey,
      entries: queueEntriesFromShow(show),
      updatedAtUtc: show.updatedAtUtc
    };
  }
}
