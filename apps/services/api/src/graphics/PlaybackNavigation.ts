import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { z } from 'zod';
import { AsyncDatabase } from 'promised-sqlite3';
import sqlite3 from 'sqlite3';
import { getAppData } from '@toa-lib/server';
import {
  graphicsTargetZod,
  loadedGraphicsSnapshotZod,
  playbackAcknowledgmentZod,
  presentationFrameZod,
  resolveSpec,
  unresolvedBindings,
  type GraphicSpec,
  type GraphicsError,
  type LoadedGraphicsSnapshot,
  type PlaybackAcknowledgment,
  type PlaybackCommand,
  type PlaybackState,
  type PreparedGraphic,
  type Rundown,
  type VariableValues,
  type VersionedTimeline
} from '@toa-lib/models/base';
import {
  prepareGraphicFrame,
  type AdaptContext,
  type StatResult
} from '@toa-lib/models/seasons/stats/presentation';
import {
  PlaybackCoordinatorError,
  type PlaybackMutation,
  type PreparationAcceptance,
  type PreparationOptions,
  type PreparationTicket
} from './PlaybackCoordinator.js';

/**
 * Headless cue preparation and navigation.
 *
 * This module owns `load` / `load-rundown` / `advance` / `previous` / `go`:
 * building an immutable `LoadedGraphicsSnapshot` and driving the CUE lane of
 * `PlaybackCoordinator`'s ticket flow. It never writes `state.program` - that
 * belongs to the take/clear module - and it never blocks the coordinator's
 * state-mutation lock on a stats query: every slow call happens strictly
 * between `beginPreparation` and `completePreparation`/`failPreparation`.
 *
 * Every collaborator is injected so this can be driven, and tested, with no
 * Fastify instance and no producer socket connected anywhere - the entire
 * point of moving playback into the server.
 */

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const GRAPHICS_ERROR_CODES = new Set<GraphicsError['code']>([
  'INVALID_INPUT',
  'NOT_FOUND',
  'CONFLICT',
  'NOT_READY',
  'SUPERSEDED',
  'CALCULATION_FAILED',
  'PRESENTATION_FAILED',
  'CORRUPT_DATA',
  'UNAVAILABLE',
  'INTERRUPTED'
]);

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : String(error);
}

/** Recognizes an already-typed GraphicsError-shaped error (e.g. GraphicsRepositoryError) without importing its module. */
function codeOf(error: unknown): GraphicsError['code'] | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const { code } = error as { code?: unknown };
    if (
      typeof code === 'string' &&
      GRAPHICS_ERROR_CODES.has(code as GraphicsError['code'])
    ) {
      return code as GraphicsError['code'];
    }
  }
  return undefined;
}

export interface NavigationEntities {
  teams?: { teamKey: number; teamNumber?: string; teamNameShort?: string }[];
  /** `participants` feeds ONLY `applyAllianceGroups`' `teamsInMatchId` alliance coloring (see `semantic-helpers.ts`) - nothing else reads it. */
  matches?: {
    tournamentKey: string;
    id: number;
    name?: string;
    participants?: { teamKey: number; station: number }[];
  }[];
}

/** Reads the team/match rosters used to label a prepared frame. Optional: a missing roster degrades to bare numeric keys, never blocks a cue. */
export type LoadEntities = (eventKey: string) => Promise<NavigationEntities>;

interface TeamRow {
  teamKey: number;
  teamNumber: string | null;
  teamNameShort: string | null;
}
interface MatchRow {
  tournamentKey: string;
  id: number;
  name: string | null;
}
interface ParticipantRow {
  tournamentKey: string;
  id: number;
  teamKey: number;
  station: number;
}

/**
 * Production default: reads directly from the event's own SQLite database
 * (the same `team`/`match`/`match_participant` tables `EventStatsSnapshot.ts`
 * reads for calculation), read-only, degrading to `{}` on any failure so a
 * missing or unreadable roster never blocks cue preparation. Participants are
 * grouped onto their match by (tournamentKey, id) - the same identity pair
 * every other match lookup in this codebase uses (see `keyOf`) - never by id
 * alone, since a match id repeats across tournaments.
 */
function defaultLoadEntities(databaseRoot: string): LoadEntities {
  return async (eventKey) => {
    try {
      const db = await AsyncDatabase.open(
        join(databaseRoot, `${eventKey}.db`),
        sqlite3.OPEN_READONLY
      );
      try {
        const teamRows = await db.all<TeamRow>(
          'SELECT teamKey, teamNumber, teamNameShort FROM team WHERE eventKey = ?',
          [eventKey]
        );
        const matchRows = await db.all<MatchRow>(
          'SELECT tournamentKey, id, name FROM match WHERE eventKey = ?',
          [eventKey]
        );
        const participantRows = await db.all<ParticipantRow>(
          'SELECT tournamentKey, id, teamKey, station FROM match_participant WHERE eventKey = ?',
          [eventKey]
        );
        const participantsByMatch = new Map<
          string,
          { teamKey: number; station: number }[]
        >();
        for (const p of participantRows) {
          const key = `${p.tournamentKey}:${p.id}`;
          const list = participantsByMatch.get(key) ?? [];
          list.push({ teamKey: p.teamKey, station: p.station });
          participantsByMatch.set(key, list);
        }
        return {
          teams: teamRows.map((t) => ({
            teamKey: t.teamKey,
            teamNumber: t.teamNumber ?? undefined,
            teamNameShort: t.teamNameShort ?? undefined
          })),
          matches: matchRows.map((m) => ({
            tournamentKey: m.tournamentKey,
            id: m.id,
            name: m.name ?? undefined,
            participants:
              participantsByMatch.get(`${m.tournamentKey}:${m.id}`) ?? undefined
          }))
        };
      } finally {
        await db.close();
      }
    } catch {
      return {};
    }
  };
}

export interface PlaybackNavigationRepository {
  loadTimeline(eventKey: string, id: string): Promise<VersionedTimeline>;
  loadRundown(eventKey: string, id: string): Promise<Rundown>;
}

export interface PlaybackNavigationStats {
  catalogue(eventKey: string): Promise<{ slug: string; catalogueId: string }[]>;
  query(
    eventKey: string,
    input: unknown
  ): Promise<{ result: StatResult; calculatedAsOfUtc: string }>;
}

/** The subset of `PlaybackCoordinator` this module drives. The real coordinator satisfies this structurally. */
export interface PlaybackNavigationCoordinator {
  getState(eventKey: string): Promise<PlaybackState>;
  mutate(
    eventKey: string,
    command: PlaybackCommand,
    mutation: PlaybackMutation
  ): Promise<PlaybackAcknowledgment>;
  beginPreparation(
    eventKey: string,
    command: PlaybackCommand,
    options: PreparationOptions
  ): Promise<PreparationAcceptance>;
  completePreparation(
    ticket: PreparationTicket,
    input: PreparedGraphic
  ): Promise<PlaybackAcknowledgment>;
  failPreparation(
    ticket: PreparationTicket,
    error: GraphicsError
  ): Promise<PlaybackAcknowledgment>;
}

export interface PlaybackNavigationOptions {
  coordinator: PlaybackNavigationCoordinator;
  repository: PlaybackNavigationRepository;
  stats: PlaybackNavigationStats;
  /** Overrides the production SQLite-backed default. Tests should always supply this. */
  loadEntities?: LoadEntities;
  /** Used to build the production default `loadEntities` when one isn't supplied. Defaults to the shared app-data root. */
  databaseRoot?: string;
  /** Overrides the production `prepareGraphicFrame`. Tests should supply a deterministic fake. */
  prepareFrame?: typeof prepareGraphicFrame;
  now?: () => string;
  newId?: () => string;
}

/** Inclusive [start, end] flat-index ranges, one per contiguous run of the same `entryId` (including a single run of `undefined` for a plain `load`). */
function entryGroups(
  items: LoadedGraphicsSnapshot['items']
): [number, number][] {
  const groups: [number, number][] = [];
  let start = 0;
  for (let i = 1; i <= items.length; i++) {
    if (i === items.length || items[i].entryId !== items[start].entryId) {
      groups.push([start, i - 1]);
      start = i;
    }
  }
  return groups;
}

/** Pure boundary computation for Deviation 1: rolls forward/back across an entry boundary, clamps (returns null) only at the very first/last item overall. */
function computeStep(
  loaded: LoadedGraphicsSnapshot,
  direction: 'advance' | 'previous'
): number | null {
  const groups = entryGroups(loaded.items);
  const groupIndex = groups.findIndex(
    ([start, end]) => loaded.index >= start && loaded.index <= end
  );
  const group = groups[groupIndex];
  if (!group)
    throw new Error(
      'Loaded snapshot index is outside every entry group; this indicates a corrupt snapshot.'
    );
  const [start, end] = group;
  if (direction === 'advance') {
    if (loaded.index < end) return loaded.index + 1;
    const next = groups[groupIndex + 1];
    return next ? next[0] : null;
  }
  if (loaded.index > start) return loaded.index - 1;
  const previous = groups[groupIndex - 1];
  return previous ? previous[1] : null;
}

export class PlaybackNavigation {
  private readonly coordinator: PlaybackNavigationCoordinator;
  private readonly repository: PlaybackNavigationRepository;
  private readonly stats: PlaybackNavigationStats;
  private readonly loadEntities: LoadEntities;
  private readonly prepareFrame: typeof prepareGraphicFrame;
  private readonly now: () => string;
  private readonly newId: () => string;
  /**
   * Whole-operation replay protection, keyed by `eventKey:requestId`.
   *
   * `PlaybackCoordinator.mutate` only de-duplicates the single synchronous
   * commit it is given - for `beginPreparation` that is the "calculating"
   * commit, never the later `completePreparation`/`failPreparation` commit
   * (which persists no command record of its own; see its "no recalculation"
   * restart-recovery contract). A retried `advance`/`previous`/`go` must
   * still return the operation's FINAL result (a ready/failed cue) and must
   * never re-run the stats query, so this module owns the full-operation
   * cache itself rather than relying solely on the coordinator's per-commit
   * one. Only a successful (`ok: true`) result is kept - a rejected attempt
   * is evicted immediately so a genuine failure (e.g. a transient
   * repository error) can be retried under the same requestId, mirroring
   * the coordinator's own "a failed write records no command" contract.
   * Retained indefinitely, matching the coordinator's own command log.
   */
  private readonly requestCache = new Map<
    string,
    Promise<PlaybackAcknowledgment>
  >();

  constructor(options: PlaybackNavigationOptions) {
    this.coordinator = options.coordinator;
    this.repository = options.repository;
    this.stats = options.stats;
    this.loadEntities =
      options.loadEntities ??
      defaultLoadEntities(options.databaseRoot ?? getAppData('ems'));
    this.prepareFrame = options.prepareFrame ?? prepareGraphicFrame;
    this.now = options.now ?? (() => new Date().toISOString());
    this.newId = options.newId ?? randomUUID;
  }

  /** Runs `run()` at most once per (eventKey, requestId); a repeat while in flight or after success returns the ORIGINAL result, marked `replayed: true`, and never re-invokes `run`. */
  private dedupe(
    eventKey: string,
    requestId: string,
    run: () => Promise<PlaybackAcknowledgment>
  ): Promise<PlaybackAcknowledgment> {
    const key = `${eventKey}:${requestId}`;
    const cached = this.requestCache.get(key);
    if (cached)
      return cached.then((ack) => (ack.ok ? { ...ack, replayed: true } : ack));
    const promise = run();
    this.requestCache.set(key, promise);
    promise.then(
      (ack) => {
        if (!ack.ok) this.requestCache.delete(key);
      },
      () => {
        this.requestCache.delete(key);
      }
    );
    return promise;
  }

  /** Single entry point for the six commands this module owns; every other command type is a caller error. */
  handle(
    eventKey: string,
    command: PlaybackCommand
  ): Promise<PlaybackAcknowledgment> {
    switch (command.type) {
      case 'load':
        return this.load(eventKey, command);
      case 'load-rundown':
        return this.loadRundown(eventKey, command);
      case 'unload':
        return this.unload(eventKey, command);
      case 'advance':
        return this.advance(eventKey, command);
      case 'previous':
        return this.previous(eventKey, command);
      case 'go':
        return this.go(eventKey, command);
      default:
        throw new Error(
          `PlaybackNavigation does not handle command type "${command.type}".`
        );
    }
  }

  /**
   * Durably empties the transport back to nothing-loaded - the mirror of
   * `PlaybackProgram.clear` (which nulls `program`), but for `loaded`. A
   * pure synchronous state edit, so it goes straight through
   * `coordinator.mutate` like `clear` does, never through a preparation
   * ticket. Idempotent: unloading an already-unloaded transport is still a
   * success. Leaves `cue`/`program` untouched - a caller that wants those
   * cleared too issues `clear` itself (see the web producer UI's "Animate
   * Out and Clear", which always calls `clear` before this).
   */
  unload(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'unload' }>
  ): Promise<PlaybackAcknowledgment> {
    return this.dedupe(eventKey, command.requestId, () =>
      this.coordinator.mutate(eventKey, command, (draft) => {
        draft.loaded = null;
      })
    );
  }

  load(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'load' }>
  ): Promise<PlaybackAcknowledgment> {
    return this.dedupe(eventKey, command.requestId, () =>
      this.loadInternal(eventKey, command)
    );
  }

  private async loadInternal(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'load' }>
  ): Promise<PlaybackAcknowledgment> {
    let timeline: VersionedTimeline;
    try {
      timeline = await this.repository.loadTimeline(
        eventKey,
        command.timelineId
      );
    } catch (error) {
      return this.rejected(
        eventKey,
        command.requestId,
        this.mapInputError(error)
      );
    }
    // `command.values` resolves template bindings the same way a rundown
    // entry's `values` does (see `buildItems`). When the caller sends none -
    // notably the web producer UI's live-timeline Save, which reloads
    // whatever timeline is already cued to the transport to pick up the
    // edit, and has no `values` of its own to resend - fall back to the
    // values already loaded for THIS SAME timeline, so a live-save can never
    // silently drop template bindings that were already resolved. A load of
    // a genuinely different timeline, or explicit `values` (even `{}`),
    // always wins over this fallback.
    const previous = await this.coordinator.getState(eventKey);
    const previousValues =
      previous.loaded?.source.kind === 'timeline' &&
      previous.loaded.source.timelineId === command.timelineId
        ? previous.loaded.values
        : undefined;
    const effectiveValues = command.values ?? previousValues ?? {};
    const items = this.buildItems(timeline, undefined, effectiveValues);
    if (items.length === 0) {
      return this.rejected(eventKey, command.requestId, {
        code: 'INVALID_INPUT',
        message: `Timeline "${command.timelineId}" has no items to cue.`,
        retryable: false
      });
    }
    let snapshot: LoadedGraphicsSnapshot;
    try {
      snapshot = loadedGraphicsSnapshotZod.parse({
        snapshotId: this.newId(),
        source: {
          kind: 'timeline',
          timelineId: timeline.timelineId,
          revision: timeline.revision
        },
        timelines: [clone(timeline)],
        items,
        index: 0,
        loadedAtUtc: this.now(),
        ...(Object.keys(effectiveValues).length > 0
          ? { values: effectiveValues }
          : {})
      });
    } catch (error) {
      return this.rejected(
        eventKey,
        command.requestId,
        this.mapInputError(error)
      );
    }
    return this.prepareCueAt(eventKey, command, snapshot, 0, (draft) => {
      draft.loaded = clone(snapshot);
    });
  }

  loadRundown(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'load-rundown' }>
  ): Promise<PlaybackAcknowledgment> {
    return this.dedupe(eventKey, command.requestId, () =>
      this.loadRundownInternal(eventKey, command)
    );
  }

  private async loadRundownInternal(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'load-rundown' }>
  ): Promise<PlaybackAcknowledgment> {
    let rundown: Rundown;
    try {
      rundown = await this.repository.loadRundown(eventKey, command.rundownId);
    } catch (error) {
      return this.rejected(
        eventKey,
        command.requestId,
        this.mapInputError(error)
      );
    }
    const timelineCache = new Map<string, VersionedTimeline>();
    const timelinesUsed: VersionedTimeline[] = [];
    const items: LoadedGraphicsSnapshot['items'] = [];
    try {
      for (const entry of rundown.entries) {
        let timeline = timelineCache.get(entry.timelineId);
        if (!timeline) {
          timeline = await this.repository.loadTimeline(
            eventKey,
            entry.timelineId
          );
          timelineCache.set(entry.timelineId, timeline);
          timelinesUsed.push(clone(timeline));
        }
        items.push(
          ...this.buildItems(timeline, entry.entryId, entry.values ?? {})
        );
      }
    } catch (error) {
      // Do not partially load: one missing/invalid entry timeline fails the whole rundown load.
      return this.rejected(
        eventKey,
        command.requestId,
        this.mapInputError(error)
      );
    }
    if (items.length === 0) {
      return this.rejected(eventKey, command.requestId, {
        code: 'INVALID_INPUT',
        message: `Rundown "${command.rundownId}" has no items to cue.`,
        retryable: false
      });
    }
    let snapshot: LoadedGraphicsSnapshot;
    try {
      snapshot = loadedGraphicsSnapshotZod.parse({
        snapshotId: this.newId(),
        source: {
          kind: 'rundown',
          rundownId: rundown.rundownId,
          revision: rundown.revision
        },
        timelines: timelinesUsed,
        items,
        index: 0,
        loadedAtUtc: this.now()
      });
    } catch (error) {
      return this.rejected(
        eventKey,
        command.requestId,
        this.mapInputError(error)
      );
    }
    return this.prepareCueAt(eventKey, command, snapshot, 0, (draft) => {
      draft.loaded = clone(snapshot);
    });
  }

  advance(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'advance' }>
  ): Promise<PlaybackAcknowledgment> {
    return this.dedupe(eventKey, command.requestId, () =>
      this.step(eventKey, command, 'advance')
    );
  }

  previous(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'previous' }>
  ): Promise<PlaybackAcknowledgment> {
    return this.dedupe(eventKey, command.requestId, () =>
      this.step(eventKey, command, 'previous')
    );
  }

  go(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'go' }>
  ): Promise<PlaybackAcknowledgment> {
    return this.dedupe(eventKey, command.requestId, () =>
      this.goInternal(eventKey, command)
    );
  }

  private async goInternal(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'go' }>
  ): Promise<PlaybackAcknowledgment> {
    const state = await this.coordinator.getState(eventKey);
    if (!state.loaded) {
      return this.rejected(
        eventKey,
        command.requestId,
        { code: 'NOT_READY', message: 'Nothing is loaded.', retryable: false },
        state
      );
    }
    if (
      !Number.isInteger(command.index) ||
      command.index < 0 ||
      command.index >= state.loaded.items.length
    ) {
      return this.rejected(
        eventKey,
        command.requestId,
        {
          code: 'INVALID_INPUT',
          message: `Index ${command.index} is out of range for the loaded snapshot.`,
          retryable: false
        },
        state
      );
    }
    const snapshot = state.loaded;
    const { index } = command;
    return this.prepareCueAt(
      eventKey,
      command,
      snapshot,
      index,
      this.moveGuard(snapshot, index)
    );
  }

  private async step(
    eventKey: string,
    command: PlaybackCommand,
    direction: 'advance' | 'previous'
  ): Promise<PlaybackAcknowledgment> {
    const state = await this.coordinator.getState(eventKey);
    if (!state.loaded) {
      return this.rejected(
        eventKey,
        command.requestId,
        { code: 'NOT_READY', message: 'Nothing is loaded.', retryable: false },
        state
      );
    }
    const target = computeStep(state.loaded, direction);
    if (target === null) {
      // Boundary reached: clamp. Success, no-op - never touch the coordinator, never bump revision.
      if (
        command.expectedRevision !== undefined &&
        command.expectedRevision !== state.revision
      ) {
        return this.rejected(
          eventKey,
          command.requestId,
          {
            code: 'CONFLICT',
            message: 'Playback revision changed; reload state before retrying.',
            retryable: true
          },
          state
        );
      }
      return playbackAcknowledgmentZod.parse({
        ok: true,
        requestId: command.requestId,
        state: clone(state),
        replayed: false
      });
    }
    const snapshot = state.loaded;
    return this.prepareCueAt(
      eventKey,
      command,
      snapshot,
      target,
      this.moveGuard(snapshot, target)
    );
  }

  /** Guards the synchronous index write against a concurrent load racing ahead of us. */
  private moveGuard(
    snapshot: LoadedGraphicsSnapshot,
    index: number
  ): PlaybackMutation {
    return (draft) => {
      if (!draft.loaded)
        throw new PlaybackCoordinatorError({
          code: 'NOT_READY',
          message: 'Nothing is loaded.',
          retryable: false
        });
      if (draft.loaded.snapshotId !== snapshot.snapshotId)
        throw new PlaybackCoordinatorError({
          code: 'SUPERSEDED',
          message: 'A different snapshot was loaded concurrently.',
          retryable: false
        });
      draft.loaded.index = index;
    };
  }

  /**
   * Resolves each item's template bindings against its rundown entry's
   * `values` map (Deviation 2) at LOAD time, immediately, while both the raw
   * item spec and the entry's values are still in hand:
   *   - fully resolved -> a fresh spec (via `resolveSpec`) with `bindings`
   *     stripped and concrete selectors baked in;
   *   - anything missing -> a deep copy of the RAW spec, `bindings` intact,
   *     so `prepareCueAt` can re-derive the missing variable names later and
   *     the selector stays absent rather than defaulting to 0.
   * Both outcomes are deep copies of `timeline.items[i]`/`values`, taken
   * once, here - `loadedGraphicsSnapshotZod` has no field of its own to
   * carry a resolved-values map, so resolving up front (rather than at
   * navigation time) is what makes the snapshot immune to a later edit of
   * the saved rundown or timeline while still satisfying "never re-resolve
   * against stale/edited values".
   */
  private buildItems(
    timeline: VersionedTimeline,
    entryId: string | undefined,
    values: VariableValues
  ): LoadedGraphicsSnapshot['items'] {
    return timeline.items.map((rawSpec, itemIndex) => {
      const missing = unresolvedBindings(rawSpec, values);
      const spec =
        missing.length === 0 ? resolveSpec(rawSpec, values) : clone(rawSpec);
      return {
        timelineId: timeline.timelineId,
        timelineRevision: timeline.revision,
        ...(entryId !== undefined ? { entryId } : {}),
        itemIndex,
        spec
      };
    });
  }

  /**
   * The shared path used by every load/navigation: resolve-check, then
   * either fail synchronously (unresolved binding) or run the full
   * ticket-guarded prepare-cue sequence (beginPreparation -> stats query ->
   * frame -> completePreparation/failPreparation), exactly as required.
   */
  private async prepareCueAt(
    eventKey: string,
    command: PlaybackCommand,
    snapshot: LoadedGraphicsSnapshot,
    index: number,
    updateState: PlaybackMutation
  ): Promise<PlaybackAcknowledgment> {
    const item = snapshot.items[index];
    const boundKeys = item.spec.bindings ? Object.keys(item.spec.bindings) : [];
    if (boundKeys.length > 0) {
      // Deviation 2: never substitute a default. Prepare nothing; the stats service is never called.
      const missing = unresolvedBindings(item.spec, {});
      return this.coordinator.mutate(eventKey, command, (draft, context) => {
        updateState(draft, context);
        const target = graphicsTargetZod.parse({
          targetId: this.newId(),
          targetRevision: context.nextRevision,
          requestId: command.requestId,
          snapshotId: snapshot.snapshotId,
          index
        });
        draft.cue = {
          status: 'failed',
          target,
          spec: clone(item.spec),
          error: {
            code: 'INVALID_INPUT',
            message: `Fill in: ${missing.join(', ')}`,
            retryable: false
          }
        };
      });
    }

    let acceptance: PreparationAcceptance;
    try {
      acceptance = await this.coordinator.beginPreparation(eventKey, command, {
        lane: 'cue',
        snapshotId: snapshot.snapshotId,
        index,
        spec: item.spec,
        updateState
      });
    } catch (error) {
      // e.g. the resolved spec itself is invalid (unsupported kind/mode): no ticket was ever created.
      return this.rejected(
        eventKey,
        command.requestId,
        this.mapInputError(error)
      );
    }
    if (!acceptance.ticket) return acceptance.acknowledgment; // replayed or rejected: never start a second calculation.
    const { ticket } = acceptance;

    try {
      const catalogue = await this.stats.catalogue(eventKey);
      const entry = catalogue.find((c) => c.slug === item.spec.stat);
      if (!entry) {
        return await this.coordinator.failPreparation(ticket, {
          code: 'CALCULATION_FAILED',
          message: `Unknown stat "${item.spec.stat}".`,
          retryable: false
        });
      }
      const response = await this.stats.query(eventKey, {
        stat: item.spec.stat,
        selectors: item.spec.selectors,
        filters: item.spec.filters,
        params: item.spec.params
      });
      // A non-'ok' result is a NORMAL producer-facing outcome, not an exception.
      if (response.result.status !== 'ok') {
        return await this.coordinator.failPreparation(ticket, {
          code: 'CALCULATION_FAILED',
          message: response.result.reason,
          retryable: false
        });
      }
      const entities = await this.loadEntities(eventKey);
      const ctx: AdaptContext = {
        catalogueId: entry.catalogueId,
        teams: entities.teams,
        matches: entities.matches,
        asOfUtc: response.calculatedAsOfUtc
      };
      // Validated before it can reach completePreparation: a bad frame fails as PRESENTATION_FAILED, never corrupts state.
      const frame = presentationFrameZod.parse(
        this.prepareFrame(response.result, item.spec, ctx)
      );
      return await this.coordinator.completePreparation(ticket, {
        target: ticket.target,
        spec: ticket.spec,
        frame,
        preparedAtUtc: this.now()
      });
    } catch (error) {
      return await this.coordinator.failPreparation(
        ticket,
        this.mapPreparationError(error)
      );
    }
  }

  private async rejected(
    eventKey: string,
    requestId: string,
    error: GraphicsError,
    stateOverride?: PlaybackState
  ): Promise<PlaybackAcknowledgment> {
    const state = stateOverride ?? (await this.coordinator.getState(eventKey));
    return playbackAcknowledgmentZod.parse({
      ok: false,
      requestId,
      error,
      state: clone(state)
    });
  }

  /** For repository/lookup/input failures: preserves an already-typed GraphicsRepositoryError-shaped code, defaults to INVALID_INPUT. */
  private mapInputError(error: unknown): GraphicsError {
    const code = codeOf(error);
    return {
      code: code ?? 'INVALID_INPUT',
      message: errorMessage(error) || 'Invalid request.',
      retryable: code === 'UNAVAILABLE'
    };
  }

  /** For failures inside the async prepare-cue sequence: a bad frame is PRESENTATION_FAILED, everything else defaults to CALCULATION_FAILED. */
  private mapPreparationError(error: unknown): GraphicsError {
    if (error instanceof z.ZodError) {
      return {
        code: 'PRESENTATION_FAILED',
        message:
          error.issues.map((i) => i.message).join('; ') ||
          'Invalid presentation frame.',
        retryable: false
      };
    }
    const code = codeOf(error);
    return {
      code: code ?? 'CALCULATION_FAILED',
      message: errorMessage(error) || 'Calculation failed.',
      retryable: code === 'UNAVAILABLE'
    };
  }
}
