import { join } from 'node:path';
import { z } from 'zod';
import { AsyncDatabase } from 'promised-sqlite3';
import sqlite3 from 'sqlite3';
import { getAppData } from '@toa-lib/server';
import {
  describeStagedUpdateNotReady,
  graphicsTransitionZod,
  playbackAcknowledgmentZod,
  presentationFrameZod,
  snapshotPreparedGraphic,
  type GraphicSpec,
  type GraphicsError,
  type GraphicsTarget,
  type PlaybackAcknowledgment,
  type PlaybackCommand,
  type PlaybackState,
  type PreparedGraphic
} from '@toa-lib/models/base';
import { canonicalJson } from '@toa-lib/models/seasons/stats';
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
import { TRANSITION_TIMING_MS } from './PlaybackProgram.js';

/**
 * Headless staged-update control: `refresh` and `push-update`.
 *
 * This module owns `state.stagedUpdate` - the third and last playback lane,
 * sibling to `PlaybackNavigation` (cue: load/load-rundown/advance/previous/go)
 * and `PlaybackProgram` (program: take/clear/quick-take). It never writes
 * `state.loaded`, and it writes `state.cue`/`state.program` ONLY through an
 * explicit `push-update`, never as a side effect of `refresh`.
 *
 * The product rule this module exists to enforce: recalculating a graphic
 * NEVER changes what is on air unless the producer commanded THAT change.
 * `refresh` computes into `stagedUpdate` and stops at `ready`; a separate,
 * explicit `push-update` command is required to promote that staged result
 * onto the cue or the program. "Update ready" is reported only after both the
 * recalculation AND `presentationFrameZod` validation have succeeded - even
 * when the freshly computed values are byte-identical to what is already on
 * air. There is no code path in this module that writes `state.program` or
 * `state.cue` from a plain `refresh`.
 *
 * The ONE exception is `refresh` with `push: true`, where the producer named
 * the destination AND the promotion in the same request. That promotion
 * happens inside the same durable commit as the staging, so it can only ever
 * promote the recalculation that command itself produced. It exists precisely
 * so no caller has to spell "recalculate then push it" as two requests: that
 * pair has a window in which a DIFFERENT staged update can be promoted
 * instead, which is a live-invariant violation, not a race worth tolerating.
 *
 * Every collaborator is injected so this can be driven, and tested, with no
 * Fastify instance and no producer socket connected anywhere - a Bitfocus
 * Companion button must be able to drive the broadcast with nothing else
 * running.
 */

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const sameTarget = (a: GraphicsTarget, b: GraphicsTarget) =>
  canonicalJson(a) === canonicalJson(b);

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

/** Recognizes an already-typed GraphicsError-shaped error without importing its module. */
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

export interface RefreshEntities {
  teams?: { teamKey: number; teamNumber?: string; teamNameShort?: string }[];
  /** `participants` feeds ONLY `applyAllianceGroups`' `teamsInMatchId` alliance coloring (see `semantic-helpers.ts`) - nothing else reads it. */
  matches?: {
    tournamentKey: string;
    id: number;
    name?: string;
    participants?: { teamKey: number; station: number }[];
  }[];
}

/** Reads the team/match rosters used to label a refreshed frame. Optional: a missing roster degrades to bare numeric keys, never blocks a refresh. */
export type LoadRefreshEntities = (
  eventKey: string
) => Promise<RefreshEntities>;

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
 * Production default: reads directly from the event's own SQLite database,
 * read-only, degrading to `{}` on any failure so a missing or unreadable
 * roster never blocks a refresh. Mirrors `PlaybackProgram`/`PlaybackNavigation`'s
 * default loader (not imported from either - that function isn't exported,
 * and this module must stand alone).
 */
function defaultLoadEntities(databaseRoot: string): LoadRefreshEntities {
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

export interface PlaybackRefreshStats {
  catalogue(eventKey: string): Promise<{ slug: string; catalogueId: string }[]>;
  /**
   * Forces or joins one real worker flight and awaits its result - never the
   * stale-while-refresh value `query()` may return. A refresh means the
   * producer explicitly asked for new numbers; returning a stale cached
   * value here would silently lie about what "recalculate" did.
   */
  queryFresh(
    eventKey: string,
    input: unknown
  ): Promise<{ result: StatResult; calculatedAsOfUtc: string }>;
}

/** The subset of `PlaybackCoordinator` this module drives. The real coordinator satisfies this structurally. */
export interface PlaybackRefreshCoordinator {
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
    input: PreparedGraphic,
    afterReady?: PlaybackMutation
  ): Promise<PlaybackAcknowledgment>;
  failPreparation(
    ticket: PreparationTicket,
    error: GraphicsError
  ): Promise<PlaybackAcknowledgment>;
}

export interface PlaybackRefreshOptions {
  coordinator: PlaybackRefreshCoordinator;
  stats: PlaybackRefreshStats;
  /** Overrides the production SQLite-backed default. Tests should always supply this. */
  loadEntities?: LoadRefreshEntities;
  /** Used to build the production default `loadEntities` when one isn't supplied. Defaults to the shared app-data root. */
  databaseRoot?: string;
  /** Overrides the production `prepareGraphicFrame`. Tests should supply a deterministic fake. */
  prepareFrame?: typeof prepareGraphicFrame;
  now?: () => string;
}

export class PlaybackRefresh {
  private readonly coordinator: PlaybackRefreshCoordinator;
  private readonly stats: PlaybackRefreshStats;
  private readonly loadEntities: LoadRefreshEntities;
  private readonly prepareFrame: typeof prepareGraphicFrame;
  private readonly now: () => string;
  /**
   * Whole-operation replay protection for `refresh` ONLY, keyed by
   * `eventKey:requestId`.
   *
   * `push-update` is a single `PlaybackCoordinator.mutate` call, and `mutate`
   * already de-dupes by `requestId` internally (it looks up a persisted
   * `PlaybackCommandRecord` before doing any work and replays its stored
   * acknowledgment verbatim - see `PlaybackCoordinator.mutate`). This module
   * adds nothing on top for `push-update`.
   *
   * `refresh` is a two-commit operation (`beginPreparation`'s commit, then
   * `completePreparation`/`failPreparation`'s later commit). The
   * coordinator's built-in cache covers only the first of those - a retried
   * `refresh` under the same `requestId` could otherwise start a second
   * `queryFresh` flight while the first is still in flight, or return a
   * stale `calculating` snapshot. So, exactly like `PlaybackProgram` and
   * `PlaybackNavigation` do for their own multi-commit operations, this
   * module owns the full-operation cache itself. Only a successful
   * (`ok: true`) result is retained indefinitely; a rejected attempt is
   * evicted immediately so a genuine failure (e.g. a transient stats error)
   * can be retried under the same requestId.
   *
   * A DIFFERENT requestId is not covered by this cache at all: the second
   * `refresh`'s own `beginPreparation` call supersedes the first in
   * `stagedUpdate` (same origin, different `requestId`), and the first
   * refresh's later `completePreparation` is then correctly rejected
   * `SUPERSEDED` by the coordinator's own `ticketCurrent()` check. That is
   * the coordinator's supersession logic, not this cache's.
   */
  private readonly requestCache = new Map<
    string,
    Promise<PlaybackAcknowledgment>
  >();

  constructor(options: PlaybackRefreshOptions) {
    this.coordinator = options.coordinator;
    this.stats = options.stats;
    this.loadEntities =
      options.loadEntities ??
      defaultLoadEntities(options.databaseRoot ?? getAppData('ems'));
    this.prepareFrame = options.prepareFrame ?? prepareGraphicFrame;
    this.now = options.now ?? (() => new Date().toISOString());
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

  /** Single entry point for the two commands this module owns; every other command type is a caller error. */
  handle(
    eventKey: string,
    command: PlaybackCommand
  ): Promise<PlaybackAcknowledgment> {
    switch (command.type) {
      case 'refresh':
        return this.refresh(eventKey, command);
      case 'push-update':
        return this.pushUpdate(eventKey, command);
      default:
        throw new Error(
          `PlaybackRefresh does not handle command type "${command.type}".`
        );
    }
  }

  /**
   * Recalculates the graphic currently live at `command.target` (the
   * "origin") with fresh data, staging the result rather than airing it.
   *
   * The spec recalculated is whatever is ALREADY live at the origin -
   * `state.program.graphic.spec` for `destination: 'program'`, or
   * `state.cue.graphic.spec` for `destination: 'cue'` when the cue is
   * `ready`. A refresh changes data, never the graphic: the live spec is
   * already fully resolved and is never rebuilt or re-bound here.
   *
   * `beginPreparation` (lane `'stagedUpdate'`) both performs and publishes
   * the "calculating" commit, and rejects `SUPERSEDED` before any query runs
   * if the origin no longer names the live graphic at that destination -
   * that guard, and the later re-check in `completePreparation`/
   * `failPreparation` against a target/take/clear that lands mid-flight, are
   * the coordinator's own logic (see `PlaybackCoordinator.beginPreparation`
   * and `ticketCurrent`), not reimplemented here.
   */
  refresh(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'refresh' }>
  ): Promise<PlaybackAcknowledgment> {
    return this.dedupe(eventKey, command.requestId, () =>
      this.refreshInternal(eventKey, command)
    );
  }

  private async refreshInternal(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'refresh' }>
  ): Promise<PlaybackAcknowledgment> {
    const state = await this.coordinator.getState(eventKey);
    const liveGraphic =
      command.destination === 'program'
        ? state.program?.graphic
        : state.cue.status === 'ready'
          ? state.cue.graphic
          : undefined;
    const liveSpec: GraphicSpec | undefined = liveGraphic?.spec;
    if (!liveSpec) {
      // Nothing is currently live at that destination at all: the origin cannot possibly still be current.
      // No ticket is ever created and queryFresh is never called.
      return this.rejected(
        eventKey,
        command.requestId,
        {
          code: 'SUPERSEDED',
          message: 'Refresh target is no longer current.',
          retryable: false
        },
        state
      );
    }

    // A refresh recalculates the graphic ALREADY live at this destination; it does
    // not move it. Carry its show coordinates forward so the promoted copy still
    // knows where it sits in the loaded show - PVW and anything else that reads the
    // program's position depends on that surviving a push. An ad-hoc graphic that
    // never had a position keeps none: a show coordinate is never invented here.
    const liveTarget = liveGraphic?.target;
    const livePosition: { snapshotId: string; index: number } | { snapshotId?: null; index?: null } =
      liveTarget && liveTarget.snapshotId !== null && liveTarget.index !== null
        ? { snapshotId: liveTarget.snapshotId, index: liveTarget.index }
        : { snapshotId: null, index: null };

    let acceptance: PreparationAcceptance;
    try {
      acceptance = await this.coordinator.beginPreparation(eventKey, command, {
        lane: 'stagedUpdate',
        destination: command.destination,
        origin: command.target,
        spec: liveSpec,
        ...livePosition
      });
    } catch (error) {
      // e.g. the live spec itself somehow fails preparedGraphicSpecZod: no ticket was ever created, nothing changed.
      return this.rejected(
        eventKey,
        command.requestId,
        this.mapInputError(error)
      );
    }
    if (!acceptance.ticket) return acceptance.acknowledgment; // replayed or rejected (including SUPERSEDED): never start a second calculation.
    const { ticket } = acceptance;
    const origin = ticket.origin ?? command.target;

    try {
      const catalogue = await this.stats.catalogue(eventKey);
      const entry = catalogue.find((c) => c.slug === ticket.spec.stat);
      if (!entry) {
        return await this.coordinator.failPreparation(ticket, {
          code: 'CALCULATION_FAILED',
          message: `Unknown stat "${ticket.spec.stat}".`,
          retryable: false
        });
      }
      const response = await this.stats.queryFresh(eventKey, {
        stat: ticket.spec.stat,
        selectors: ticket.spec.selectors,
        filters: ticket.spec.filters,
        params: ticket.spec.params
      });
      // A non-'ok' result is a NORMAL producer-facing outcome, not an exception - and, unlike a
      // cue-preparation failure, a failed REFRESH must be retryable and must name what it was for:
      // the producer needs to be able to press recalculate again. stagedUpdate.failed already carries
      // `origin` and `requestId`; the message additionally names the stat and target for provenance.
      if (response.result.status !== 'ok') {
        return await this.coordinator.failPreparation(ticket, {
          code: 'CALCULATION_FAILED',
          message: `Refresh of "${ticket.spec.stat}" for target "${origin.targetId}" failed: ${response.result.reason}`,
          retryable: true
        });
      }
      const entities = await this.loadEntities(eventKey);
      const ctx: AdaptContext = {
        catalogueId: entry.catalogueId,
        teams: entities.teams,
        matches: entities.matches,
        asOfUtc: response.calculatedAsOfUtc
      };
      // Validated before it can reach completePreparation: a bad frame fails as PRESENTATION_FAILED,
      // never corrupts state and never marks the staged update ready.
      const frame = presentationFrameZod.parse(
        this.prepareFrame(response.result, ticket.spec, ctx)
      );
      const preparedAtUtc = this.now();
      // Without `command.push` there is NO afterReady mutation: staging stops at 'ready' and waits for an
      // explicit push-update. That is the entire enforcement of "DO NOT AUTO LOAD THE DATA" - a plain
      // refresh has no promotion path from here.
      //
      // With `command.push`, the caller commanded this destination and this recalculation in this one
      // request, so the promotion runs inside the SAME durable commit that marks the result ready. The
      // coordinator's `ticketCurrent` gate (forced to protect the program by the presence of an afterReady
      // mutation) has already re-verified that THIS ticket's staged update is the current one and that its
      // origin is still live at its destination - so this can only ever promote the recalculation this
      // command itself produced. There is no window in which a different staged update could be promoted
      // instead, which is exactly why a background caller must use this and never a refresh-then-push pair.
      return await this.coordinator.completePreparation(
        ticket,
        {
          target: ticket.target,
          spec: ticket.spec,
          frame,
          preparedAtUtc
        },
        command.push
          ? (draft, context) => {
              const staged = draft.stagedUpdate;
              if (staged.status !== 'ready')
                throw new PlaybackCoordinatorError({
                  code: 'SUPERSEDED',
                  message: `The ${command.destination} update this command calculated is no longer the staged update; nothing was promoted.`,
                  retryable: false
                });
              if (staged.destination !== command.destination)
                throw new PlaybackCoordinatorError({
                  code: 'SUPERSEDED',
                  message: `This command recalculated the ${command.destination}, but a ${staged.destination} update is staged instead; nothing was promoted.`,
                  retryable: false
                });
              this.promote(draft, context, staged);
            }
          : undefined
      );
    } catch (error) {
      // Never let an exception escape without failing the ticket, or stagedUpdate is stuck 'calculating' forever.
      return await this.coordinator.failPreparation(
        ticket,
        this.mapPreparationError(error)
      );
    }
  }

  /**
   * Promotes a `ready` staged update onto its intended destination. A pure
   * synchronous state edit - the graphic is already prepared and validated,
   * there is nothing left to compute - so this goes straight through
   * `coordinator.mutate`, never through a preparation ticket. `mutate`
   * enforces `expectedRevision` and requestId replay itself; nothing is
   * duplicated here.
   *
   * PRODUCER INTENT. A push promotes exactly the staged update the caller
   * formed its intent against, or fails loudly. The caller names that intent
   * with `target` (the origin it staged against) and `destination` (which
   * lane it meant); `expectedRevision` pins the exact staged update when the
   * caller has one in view. All three are validated together against what is
   * actually staged, and a mismatch is a named rejection that reports both
   * sides - never a silent promotion of the other thing.
   *
   * `destination` is optional ONLY for a producer pressing a bare Push button
   * with no prior call of their own (the Companion path), where "push what is
   * staged" IS the intent. See the field's own doc comment in `Graphics.ts`.
   *
   * Requires, in order: the staged update is `ready` (else `NOT_READY`); it is
   * staged for the destination the caller named (else `SUPERSEDED`); the
   * command's `target` matches `stagedUpdate.origin` (else `SUPERSEDED`); and
   * the origin is STILL the live graphic at its destination right now (else
   * `SUPERSEDED` - a `Clear`, or a different `Take`, wins over a stale
   * push-update).
   */
  pushUpdate(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'push-update' }>
  ): Promise<PlaybackAcknowledgment> {
    return this.coordinator.mutate(eventKey, command, (draft, context) => {
      const staged = draft.stagedUpdate;
      if (staged.status !== 'ready') {
        // Code stays `NOT_READY` even for a `'failed'` staged update (mirrors
        // `PlaybackProgram.take`'s identical reasoning for a failed cue) —
        // the failure IS surfaced, just in the message.
        throw new PlaybackCoordinatorError({
          code: 'NOT_READY',
          message: describeStagedUpdateNotReady(staged).message,
          retryable: false
        });
      }
      if (
        command.destination !== undefined &&
        command.destination !== staged.destination
      ) {
        // The whole point of this check: without it, a caller that staged a
        // CUE refresh and then pushed would promote whatever happened to be
        // staged by the time the push landed - including another operator's
        // un-pushed PROGRAM update, putting it on air with nobody having
        // pressed Push for it. `origin` cannot catch this on its own: `take`
        // preserves the cue, so after a take both lanes share one target.
        throw new PlaybackCoordinatorError({
          code: 'SUPERSEDED',
          message:
            `This push was made for the ${command.destination} update of graphic "${command.target.targetId}" ` +
            `(target revision ${command.target.targetRevision}), but what is staged now is a ` +
            `${staged.destination} update of graphic "${staged.origin.targetId}" ` +
            `(target revision ${staged.origin.targetRevision}) at playback revision ${draft.revision}. ` +
            'Nothing was promoted. Recalculate the update you meant to push and push that one.',
          retryable: false
        });
      }
      if (!sameTarget(command.target, staged.origin)) {
        throw new PlaybackCoordinatorError({
          code: 'SUPERSEDED',
          message:
            `This push was made for graphic "${command.target.targetId}" (target revision ` +
            `${command.target.targetRevision}), but the staged ${staged.destination} update is for ` +
            `graphic "${staged.origin.targetId}" (target revision ${staged.origin.targetRevision}) ` +
            `at playback revision ${draft.revision}. Nothing was promoted; it was staged for a ` +
            'different graphic.',
          retryable: false
        });
      }
      this.promote(draft, context, staged);
    });
  }

  /**
   * The promotion itself: writes the `ready` staged graphic onto its own
   * `destination` and consumes the staged slot back to `empty`.
   *
   * Shared verbatim by `push-update` and by `refresh`'s atomic
   * `push` variant, so the two can never drift into promoting differently.
   * Both callers have already established that `staged` is the update the
   * caller meant; this only re-checks that the origin is still the live
   * graphic at that destination (a `Clear` or a different `Take` beats a
   * stale promotion).
   *
   * The staged graphic is promoted as a DETACHED copy
   * (`snapshotPreparedGraphic`). A push onto `program` writes a fixed
   * same-mode-replacement crossfade transition (the spec and presentation
   * mode never change in a refresh, only the data); a push onto `cue` writes
   * no transition at all.
   */
  private promote(
    draft: PlaybackState,
    context: { nextRevision: number; now: string },
    staged: Extract<PlaybackState['stagedUpdate'], { status: 'ready' }>
  ): void {
    if (staged.destination === 'program') {
      const actual = draft.program?.graphic.target;
      if (!actual || !sameTarget(actual, staged.origin)) {
        throw new PlaybackCoordinatorError({
          code: 'SUPERSEDED',
          message:
            'The program is no longer showing the graphic this update was staged for.',
          retryable: false
        });
      }
      // Detached deep copy: a later staging mutation must not reach through a shared reference into what is on air.
      const incoming = snapshotPreparedGraphic(staged.graphic);
      draft.program = {
        revision: context.nextRevision,
        graphic: incoming,
        takenAtUtc: context.now
      };
      // Same spec, same presentation mode, only the data changed: a same-mode replacement is a crossfade.
      draft.transition = graphicsTransitionZod.parse({
        revision: context.nextRevision,
        effectiveAtUtc: context.now,
        crossfadeMs: TRANSITION_TIMING_MS.crossfade,
        exitMs: 0,
        gapMs: TRANSITION_TIMING_MS.gap,
        enterMs: 0
      });
    } else {
      const actual =
        draft.cue.status === 'ready' ? draft.cue.graphic.target : undefined;
      if (!actual || !sameTarget(actual, staged.origin)) {
        throw new PlaybackCoordinatorError({
          code: 'SUPERSEDED',
          message:
            'The cue is no longer showing the graphic this update was staged for.',
          retryable: false
        });
      }
      // Detached deep copy, same reasoning as above. Nothing on air changes: no transition is written.
      draft.cue = {
        status: 'ready',
        graphic: snapshotPreparedGraphic(staged.graphic)
      };
    }
    draft.stagedUpdate = { status: 'empty' };
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

  /** For input/validation failures before a ticket exists: preserves an already-typed GraphicsError-shaped code, defaults to INVALID_INPUT. */
  private mapInputError(error: unknown): GraphicsError {
    const code = codeOf(error);
    return {
      code: code ?? 'INVALID_INPUT',
      message: errorMessage(error) || 'Invalid request.',
      retryable: code === 'UNAVAILABLE'
    };
  }

  /** For failures inside the async recalculate-then-commit sequence: a bad frame is PRESENTATION_FAILED, everything else defaults to CALCULATION_FAILED. */
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
