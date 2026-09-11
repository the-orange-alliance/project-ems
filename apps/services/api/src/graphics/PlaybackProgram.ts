import { join } from 'node:path';
import { z } from 'zod';
import { AsyncDatabase } from 'promised-sqlite3';
import sqlite3 from 'sqlite3';
import { getAppData } from '@toa-lib/server';
import {
  graphicsTransitionZod,
  playbackAcknowledgmentZod,
  presentationFrameZod,
  snapshotPreparedGraphic,
  type GraphicsError,
  type GraphicsTarget,
  type GraphicsTransition,
  type PlaybackAcknowledgment,
  type PlaybackCommand,
  type PlaybackState,
  type PreparedGraphic,
  type PresentationMode
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

/**
 * Headless direct-spec cue and program control: `cue`, `take`, `clear`,
 * `quick-take`.
 *
 * This module owns the PROGRAM lane of `PlaybackCoordinator` - putting a
 * ready cue on air, taking the air to black, and the one-press "prepare and
 * air atomically" quick-take. It is the sibling of `PlaybackNavigation`
 * (which owns `load` / `load-rundown` / `advance` / `previous` / `go` and
 * never writes `state.program`): this module never writes `state.loaded`
 * and never reads or writes `state.stagedUpdate` (a sibling task owns
 * `refresh` / `push-update`).
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

export interface ProgramEntities {
  teams?: { teamKey: number; teamNumber?: string; teamNameShort?: string }[];
  /** `participants` feeds ONLY `applyAllianceGroups`' `teamsInMatchId` alliance coloring (see `semantic-helpers.ts`) - nothing else reads it. */
  matches?: {
    tournamentKey: string;
    id: number;
    name?: string;
    participants?: { teamKey: number; station: number }[];
  }[];
}

/** Reads the team/match rosters used to label a quick-take frame. Optional: a missing roster degrades to bare numeric keys, never blocks a quick-take. */
export type LoadProgramEntities = (
  eventKey: string
) => Promise<ProgramEntities>;

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
 * roster never blocks a quick-take. Mirrors `PlaybackNavigation`'s default
 * loader (not imported from it - that function isn't exported, and this
 * module must stand alone).
 */
function defaultLoadEntities(databaseRoot: string): LoadProgramEntities {
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

/**
 * Server-side transition defaults. Chosen to match the browser transition
 * engine's own fallback constants (`apps/web/.../transition-machine.ts`
 * `DEFAULT_CROSSFADE_MS` and `defaultTimingForMode`) as closely as a
 * cross-package boundary allows: the API cannot import from `apps/web`, so
 * these numbers are copied by value, not by reference. See this module's
 * exported `TRANSITION_TIMING_MS` for the exact figures, and the task report
 * for how they compare - a later task should reconcile the two into one
 * shared source if they are meant to be authoritative.
 */
export const TRANSITION_TIMING_MS = {
  /** Content-level crossfade for a same-mode replacement. Matches `DEFAULT_CROSSFADE_MS`. */
  crossfade: 300,
  /** Fixed empty-screen gap for a cross-mode replacement. Contract-literal per `graphicsTransitionZod.gapMs`. */
  gap: 250,
  /** Container enter/exit duration for `fullscreen`. Matches `defaultTimingForMode('fullscreen')`. */
  fullscreen: 500,
  /** Container enter/exit duration for `drawer-left` / `drawer-right` / `lower-third`. Matches `defaultTimingForMode(...)` for those modes. */
  drawerOrLowerThird: 1250
} as const;

function containerDurationMs(mode: PresentationMode): number {
  return mode === 'fullscreen'
    ? TRANSITION_TIMING_MS.fullscreen
    : TRANSITION_TIMING_MS.drawerOrLowerThird;
}

/**
 * Take transition shape:
 *  - no outgoing program (take onto black): enter only.
 *  - same mode as the outgoing program: crossfade only.
 *  - different mode: exit the outgoing mode's container, fixed gap, enter the incoming mode's container.
 */
function buildTakeTransition(
  revision: number,
  effectiveAtUtc: string,
  outgoingMode: PresentationMode | null,
  incomingMode: PresentationMode
): GraphicsTransition {
  if (outgoingMode === null) {
    return graphicsTransitionZod.parse({
      revision,
      effectiveAtUtc,
      crossfadeMs: 0,
      exitMs: 0,
      gapMs: TRANSITION_TIMING_MS.gap,
      enterMs: containerDurationMs(incomingMode)
    });
  }
  if (outgoingMode === incomingMode) {
    return graphicsTransitionZod.parse({
      revision,
      effectiveAtUtc,
      crossfadeMs: TRANSITION_TIMING_MS.crossfade,
      exitMs: 0,
      gapMs: TRANSITION_TIMING_MS.gap,
      enterMs: 0
    });
  }
  return graphicsTransitionZod.parse({
    revision,
    effectiveAtUtc,
    crossfadeMs: 0,
    exitMs: containerDurationMs(outgoingMode),
    gapMs: TRANSITION_TIMING_MS.gap,
    enterMs: containerDurationMs(incomingMode)
  });
}

/** Clear transition shape: exit only, no incoming content. */
function buildClearTransition(
  revision: number,
  effectiveAtUtc: string,
  outgoingMode: PresentationMode | null
): GraphicsTransition {
  return graphicsTransitionZod.parse({
    revision,
    effectiveAtUtc,
    crossfadeMs: 0,
    exitMs: containerDurationMs(outgoingMode ?? 'fullscreen'),
    gapMs: TRANSITION_TIMING_MS.gap,
    enterMs: 0
  });
}

export interface PlaybackProgramStats {
  catalogue(eventKey: string): Promise<{ slug: string; catalogueId: string }[]>;
  query(
    eventKey: string,
    input: unknown
  ): Promise<{ result: StatResult; calculatedAsOfUtc: string }>;
}

/** The subset of `PlaybackCoordinator` this module drives. The real coordinator satisfies this structurally. */
export interface PlaybackProgramCoordinator {
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

export interface PlaybackProgramOptions {
  coordinator: PlaybackProgramCoordinator;
  stats: PlaybackProgramStats;
  /** Overrides the production SQLite-backed default. Tests should always supply this. */
  loadEntities?: LoadProgramEntities;
  /** Used to build the production default `loadEntities` when one isn't supplied. Defaults to the shared app-data root. */
  databaseRoot?: string;
  /** Overrides the production `prepareGraphicFrame`. Tests should supply a deterministic fake. */
  prepareFrame?: typeof prepareGraphicFrame;
  now?: () => string;
}

export class PlaybackProgram {
  private readonly coordinator: PlaybackProgramCoordinator;
  private readonly stats: PlaybackProgramStats;
  private readonly loadEntities: LoadProgramEntities;
  private readonly prepareFrame: typeof prepareGraphicFrame;
  private readonly now: () => string;
  /**
   * Whole-operation replay protection for `quick-take` ONLY, keyed by
   * `eventKey:requestId`.
   *
   * `take` and `clear` are each a single `PlaybackCoordinator.mutate` call,
   * and `mutate` already de-dupes by `requestId` internally (it looks up a
   * persisted `PlaybackCommandRecord` before doing any work and replays its
   * stored acknowledgment verbatim) - see `PlaybackCoordinator.mutate`. This
   * module adds nothing on top for those two commands.
   *
   * `quick-take` is a two-commit operation (`beginPreparation`'s commit,
   * then `completePreparation`/`failPreparation`'s later commit). The
   * coordinator's built-in cache covers only the first of those - a retried
   * `quick-take` under the same `requestId` could otherwise return a stale
   * `calculating` snapshot, or start a second stats query while the first is
   * still in flight. So, exactly like `PlaybackNavigation` does for its own
   * multi-commit operations, this module owns the full-operation cache
   * itself. Only a successful (`ok: true`) result is retained indefinitely;
   * a rejected attempt is evicted immediately so a genuine failure (e.g. a
   * transient stats error) can be retried under the same requestId.
   */
  private readonly requestCache = new Map<
    string,
    Promise<PlaybackAcknowledgment>
  >();

  constructor(options: PlaybackProgramOptions) {
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

  /** Single entry point for the four commands this module owns; every other command type is a caller error. */
  handle(
    eventKey: string,
    command: PlaybackCommand
  ): Promise<PlaybackAcknowledgment> {
    switch (command.type) {
      case 'cue':
        return this.cue(eventKey, command);
      case 'take':
        return this.take(eventKey, command);
      case 'clear':
        return this.clear(eventKey, command);
      case 'quick-take':
        return this.quickTake(eventKey, command);
      default:
        throw new Error(
          `PlaybackProgram does not handle command type "${command.type}".`
        );
    }
  }

  /** Prepares a validated full spec onto cue without changing loaded or program. */
  cue(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'cue' }>
  ): Promise<PlaybackAcknowledgment> {
    return this.dedupe(eventKey, command.requestId, () =>
      this.prepareSpecInternal(eventKey, command, false)
    );
  }

  /**
   * Puts the ready cue on air. A pure synchronous state edit - no stats
   * query, no frame computation - so it goes straight through
   * `coordinator.mutate`, never through a preparation ticket.
   *
   * Rejects `NOT_READY` when the cue isn't `ready`, and `SUPERSEDED` when
   * the cue IS ready but names a different target than the one the operator
   * pressed take on (it moved on since they looked). Either way `mutate`'s
   * mutation throws before touching `draft`, so the coordinator's own
   * failed-write path (`catch` in `mutate`) returns the rejection without
   * ever committing - `program` is left byte-for-byte as it was.
   */
  take(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'take' }>
  ): Promise<PlaybackAcknowledgment> {
    return this.coordinator.mutate(eventKey, command, (draft, context) => {
      if (draft.cue.status !== 'ready') {
        throw new PlaybackCoordinatorError({
          code: 'NOT_READY',
          message: `The cue is not ready to take (status: ${draft.cue.status}).`,
          retryable: false
        });
      }
      if (!sameTarget(draft.cue.graphic.target, command.target)) {
        throw new PlaybackCoordinatorError({
          code: 'SUPERSEDED',
          message:
            'The cued graphic no longer matches the requested target; the operator was looking at a graphic that has since been replaced.',
          retryable: false
        });
      }
      const outgoingMode: PresentationMode | null = draft.program
        ? draft.program.graphic.spec.mode
        : null;
      // Detached deep copy: a later cue mutation must not reach through a shared reference into what is on air.
      const incoming = snapshotPreparedGraphic(draft.cue.graphic);
      draft.program = {
        revision: context.nextRevision,
        graphic: incoming,
        takenAtUtc: context.now
      };
      draft.transition = buildTakeTransition(
        context.nextRevision,
        context.now,
        outgoingMode,
        incoming.spec.mode
      );
      // draft.cue is intentionally left untouched: take preserves the cue (GRAPHICS_PLAYBACK_POLICY.take: 'ready-target-only'
      // says nothing about clearing it, and the operator must be able to take the same graphic again).
    });
  }

  /**
   * Takes the air to black, durably. `program` becomes `null`; `cue` is
   * preserved untouched (`GRAPHICS_PLAYBACK_POLICY.clear: 'preserve-cue'`),
   * so the operator can press take again and get the same graphic back.
   * Idempotent from the operator's point of view (clearing an already-clear
   * program is still a success) but NOT optimized into a no-op: it still
   * bumps the revision and the program epoch, which is exactly how it can
   * supersede an in-flight quick-take.
   */
  clear(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'clear' }>
  ): Promise<PlaybackAcknowledgment> {
    return this.coordinator.mutate(eventKey, command, (draft, context) => {
      const outgoingMode: PresentationMode | null = draft.program
        ? draft.program.graphic.spec.mode
        : null;
      draft.program = null;
      draft.transition = buildClearTransition(
        context.nextRevision,
        context.now,
        outgoingMode
      );
    });
  }

  /**
   * Prepares a full, already-resolved spec and airs it in one acknowledged
   * operation: no cue step visible to the operator, and no window where the
   * graphic is cued-but-not-aired.
   *
   * `beginPreparation` -> stats query -> frame -> `completePreparation`
   * with an `afterReady` mutation that promotes the just-readied cue onto
   * `program` IN THE SAME COMMIT (`completePreparation`'s own contract: its
   * `afterReady` hook exists "e.g. an atomic quick-take promotion"). That
   * single commit is what makes this atomic - see this class's own tests
   * for the revision-number proof.
   *
   * `completePreparation` is called with `afterReady` set, which makes the
   * coordinator enforce that the program epoch has not moved since the
   * ticket was issued (`ticket.programEpoch`): a `clear` or a different
   * `take` landing during preparation causes this quick-take to be rejected
   * `SUPERSEDED` instead of stomping a newer operator decision. That
   * protection is the coordinator's, not reimplemented here - this method
   * only has to avoid swallowing the rejection, which it does by returning
   * `completePreparation`'s acknowledgment verbatim.
   */
  quickTake(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'quick-take' }>
  ): Promise<PlaybackAcknowledgment> {
    return this.dedupe(eventKey, command.requestId, () =>
      this.prepareSpecInternal(eventKey, command, true)
    );
  }

  private async prepareSpecInternal(
    eventKey: string,
    command: Extract<PlaybackCommand, { type: 'cue' | 'quick-take' }>,
    takeNow: boolean
  ): Promise<PlaybackAcknowledgment> {
    // For quick-take, validate that the stat exists before starting preparation to avoid
    // committing a failed state if the stat doesn't exist (return ok: false instead)
    if (command.type === 'quick-take') {
      try {
        const catalogue = await this.stats.catalogue(eventKey);
        const entry = catalogue.find((c) => c.slug === command.spec.stat);
        if (!entry) {
          const state = await this.coordinator.getState(eventKey);
          return playbackAcknowledgmentZod.parse({
            ok: false,
            requestId: command.requestId,
            error: {
              code: 'CALCULATION_FAILED',
              message: `Unknown stat "${command.spec.stat}".`,
              retryable: false
            },
            state: clone(state)
          });
        }
      } catch (error) {
        return this.rejected(
          eventKey,
          command.requestId,
          this.mapInputError(error)
        );
      }
    }

    let acceptance: PreparationAcceptance;
    try {
      acceptance = await this.coordinator.beginPreparation(eventKey, command, {
        lane: 'cue',
        snapshotId: null,
        index: null,
        spec: command.spec
      });
    } catch (error) {
      // e.g. the spec itself is invalid (unsupported kind/mode, unresolved bindings): no ticket was ever created, nothing changed.
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
      const entry = catalogue.find((c) => c.slug === command.spec.stat);
      if (!entry) {
        return await this.coordinator.failPreparation(ticket, {
          code: 'CALCULATION_FAILED',
          message: `Unknown stat "${command.spec.stat}".`,
          retryable: false
        });
      }
      const response = await this.stats.query(eventKey, {
        stat: command.spec.stat,
        selectors: command.spec.selectors,
        filters: command.spec.filters,
        params: command.spec.params
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
        this.prepareFrame(response.result, command.spec, ctx)
      );
      const preparedAtUtc = this.now();
      return await this.coordinator.completePreparation(
        ticket,
        { target: ticket.target, spec: ticket.spec, frame, preparedAtUtc },
        takeNow
          ? (draft, context) => {
              // The coordinator has already set draft.cue = { status: 'ready', graphic } by the time this runs.
              if (draft.cue.status !== 'ready') return;
              const outgoingMode: PresentationMode | null = draft.program
                ? draft.program.graphic.spec.mode
                : null;
              const incoming = snapshotPreparedGraphic(draft.cue.graphic);
              draft.program = {
                revision: context.nextRevision,
                graphic: incoming,
                takenAtUtc: context.now
              };
              draft.transition = buildTakeTransition(
                context.nextRevision,
                context.now,
                outgoingMode,
                incoming.spec.mode
              );
            }
          : undefined
      );
    } catch (error) {
      // Never let an exception escape without failing the ticket, or the cue is stuck 'calculating' forever.
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

  /** For input/validation failures before a ticket exists: preserves an already-typed GraphicsError-shaped code, defaults to INVALID_INPUT. */
  private mapInputError(error: unknown): GraphicsError {
    const code = codeOf(error);
    return {
      code: code ?? 'INVALID_INPUT',
      message: errorMessage(error) || 'Invalid request.',
      retryable: code === 'UNAVAILABLE'
    };
  }

  /** For failures inside the async prepare-then-commit sequence: a bad frame is PRESENTATION_FAILED, everything else defaults to CALCULATION_FAILED. */
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
