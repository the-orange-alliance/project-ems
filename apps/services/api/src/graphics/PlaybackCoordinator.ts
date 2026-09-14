import { randomUUID } from 'node:crypto';
import {
  graphicIdentifierZod,
  graphicsErrorZod,
  graphicsTargetZod,
  playbackAcknowledgmentZod,
  playbackCommandZod,
  playbackStateZod,
  preparedGraphicSpecZod,
  preparedGraphicZod,
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

export interface PlaybackCommandRecord {
  requestId: string;
  fingerprint: string;
  acknowledgment: PlaybackAcknowledgment;
}

export interface PlaybackStorage {
  loadPlayback(eventKey: string): Promise<PlaybackState>;
  savePlayback(
    eventKey: string,
    state: PlaybackState,
    expectedRevision: number,
    command?: PlaybackCommandRecord
  ): Promise<PlaybackState>;
  loadCommand(
    eventKey: string,
    requestId: string
  ): Promise<PlaybackCommandRecord | null>;
}

export interface PlaybackCoordinatorOptions {
  storage: PlaybackStorage;
  publish?: (eventKey: string, state: PlaybackState) => Promise<void> | void;
  onPublicationError?: (eventKey: string, error: unknown) => void;
  publicationRetryBaseMs?: number;
  publicationRetryMaxMs?: number;
  now?: () => string;
  newId?: () => string;
}

export interface PlaybackDeliveryHealth {
  configured: boolean;
  pendingRevision: number | null;
  attempts: number;
  nextRetryAtUtc: string | null;
  lastDeliveredRevision: number | null;
  lastDeliveredAtUtc: string | null;
  error: string | null;
}

export class PlaybackCoordinatorError extends Error {
  constructor(readonly detail: GraphicsError) {
    super(detail.message);
  }
}

export interface PlaybackMutationContext {
  nextRevision: number;
  now: string;
}

/** Synchronous only: perform slow queries before calling mutate, or use preparation tickets. */
export type PlaybackMutation = (
  draft: PlaybackState,
  context: PlaybackMutationContext
) => void;

type PreparationLocation =
  | { snapshotId: string; index: number }
  | {
      snapshotId?: null;
      index?: null;
    };

export type PreparationOptions = PreparationLocation & {
  spec: GraphicSpec;
  /** Only a short synchronous loaded-snapshot/navigation mutation may be supplied here. */
  updateState?: PlaybackMutation;
} & (
    | { lane: 'cue' }
    | {
        lane: 'stagedUpdate';
        destination: 'cue' | 'program';
        origin: GraphicsTarget;
      }
  );

export interface PreparationTicket {
  eventKey: string;
  requestId: string;
  lane: 'cue' | 'stagedUpdate';
  target: GraphicsTarget;
  spec: GraphicSpec;
  origin?: GraphicsTarget;
  destination?: 'cue' | 'program';
  /** Guard clear/take even when a repeated Clear changes null program to null program. */
  programEpoch: number;
  /** The revision before the preparation began; used to report the correct revision in the final acknowledgment. */
  originalRevision: number;
}

export interface PreparationAcceptance {
  acknowledgment: PlaybackAcknowledgment;
  /** Null for replayed/rejected commands: never start a second calculation for a replay. */
  ticket: PreparationTicket | null;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const sameTarget = (a: GraphicsTarget, b: GraphicsTarget) =>
  canonicalJson(a) === canonicalJson(b);
const interrupted: GraphicsError = {
  code: 'INTERRUPTED',
  message: 'Calculation was interrupted by service restart; retry explicitly.',
  retryable: true
};

/** One coordinator per API process. State mutations are short, per-event, and durable before publication. */
export class PlaybackCoordinator {
  private readonly states = new Map<string, PlaybackState>();
  private readonly queues = new Map<string, Promise<void>>();
  private readonly programEpochs = new Map<string, number>();
  private readonly pendingPublications = new Map<string, PlaybackState>();
  private readonly publicationFlights = new Map<string, Promise<void>>();
  private readonly publicationErrors = new Map<string, unknown>();
  private readonly publicationAttempts = new Map<string, number>();
  private readonly publicationRetryTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private readonly nextPublicationRetries = new Map<string, string>();
  private readonly lastDeliveries = new Map<
    string,
    { revision: number; atUtc: string }
  >();
  private readonly now: () => string;
  private readonly newId: () => string;
  private readonly publicationRetryBaseMs: number;
  private readonly publicationRetryMaxMs: number;
  private closing = false;

  constructor(private readonly options: PlaybackCoordinatorOptions) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.newId = options.newId ?? randomUUID;
    this.publicationRetryBaseMs = Math.max(
      1,
      options.publicationRetryBaseMs ?? 250
    );
    this.publicationRetryMaxMs = Math.max(
      this.publicationRetryBaseMs,
      options.publicationRetryMaxMs ?? 10_000
    );
  }

  private serial<T>(eventKey: string, operation: () => Promise<T>): Promise<T> {
    graphicIdentifierZod.parse(eventKey);
    const predecessor = this.queues.get(eventKey) ?? Promise.resolve();
    const result = predecessor.then(operation);
    const settled = result.then(
      () => {},
      () => {}
    );
    this.queues.set(eventKey, settled);
    void settled.then(() => {
      if (this.queues.get(eventKey) === settled) this.queues.delete(eventKey);
    });
    return result;
  }

  private async current(eventKey: string): Promise<PlaybackState> {
    const existing = this.states.get(eventKey);
    if (existing) return existing;
    let state = playbackStateZod.parse(
      await this.options.storage.loadPlayback(eventKey)
    );
    if (state.eventKey !== eventKey)
      throw new PlaybackCoordinatorError({
        code: 'CORRUPT_DATA',
        message: 'Stored playback belongs to another event.',
        retryable: false
      });
    if (
      state.cue.status === 'calculating' ||
      state.stagedUpdate.status === 'calculating'
    ) {
      const restored = clone(state);
      if (restored.cue.status === 'calculating')
        restored.cue = {
          ...restored.cue,
          status: 'failed',
          error: interrupted
        };
      if (restored.stagedUpdate.status === 'calculating')
        restored.stagedUpdate = {
          ...restored.stagedUpdate,
          status: 'failed',
          error: interrupted
        };
      restored.revision++;
      restored.updatedAtUtc = this.now();
      state = playbackStateZod.parse(restored);
      await this.options.storage.savePlayback(
        eventKey,
        clone(state),
        state.revision - 1
      );
    }
    this.states.set(eventKey, clone(state));
    this.programEpochs.set(eventKey, 0);
    this.queuePublication(state);
    return this.states.get(eventKey)!;
  }

  getState(eventKey: string): Promise<PlaybackState> {
    return this.serial(eventKey, async () =>
      clone(await this.current(eventKey))
    );
  }

  private queuePublication(state: PlaybackState) {
    if (!this.options.publish) return;
    const pending = this.pendingPublications.get(state.eventKey);
    if (!pending || state.revision >= pending.revision)
      this.pendingPublications.set(state.eventKey, clone(state));
    // Network delivery must not hold the state-mutation lock or delay Clear.
    void this.retryPublication(state.eventKey).catch(() => {});
  }

  private schedulePublicationRetry(eventKey: string): void {
    if (
      this.closing ||
      this.publicationRetryTimers.has(eventKey) ||
      !this.pendingPublications.has(eventKey)
    )
      return;
    const attempts = this.publicationAttempts.get(eventKey) ?? 1;
    const delayMs = Math.min(
      this.publicationRetryMaxMs,
      this.publicationRetryBaseMs * 2 ** Math.min(attempts - 1, 16)
    );
    this.nextPublicationRetries.set(
      eventKey,
      new Date(Date.now() + delayMs).toISOString()
    );
    const timer = setTimeout(() => {
      this.publicationRetryTimers.delete(eventKey);
      this.nextPublicationRetries.delete(eventKey);
      void this.retryPublication(eventKey).catch(() => {});
    }, delayMs);
    timer.unref?.();
    this.publicationRetryTimers.set(eventKey, timer);
  }

  /** Retries the latest pending snapshot. Failed delivery never rolls back durable acceptance. */
  retryPublication(eventKey: string): Promise<void> {
    const existing = this.publicationFlights.get(eventKey);
    if (existing) return existing;
    const flight = Promise.resolve()
      .then(async () => {
        while (this.options.publish && this.pendingPublications.has(eventKey)) {
          const state = this.pendingPublications.get(eventKey)!;
          try {
            await this.options.publish(eventKey, clone(state));
            this.publicationErrors.delete(eventKey);
            this.publicationAttempts.delete(eventKey);
            this.nextPublicationRetries.delete(eventKey);
            const retryTimer = this.publicationRetryTimers.get(eventKey);
            if (retryTimer) clearTimeout(retryTimer);
            this.publicationRetryTimers.delete(eventKey);
            this.lastDeliveries.set(eventKey, {
              revision: state.revision,
              atUtc: this.now()
            });
            if (
              this.pendingPublications.get(eventKey)?.revision ===
              state.revision
            )
              this.pendingPublications.delete(eventKey);
          } catch (error) {
            this.publicationErrors.set(eventKey, error);
            this.publicationAttempts.set(
              eventKey,
              (this.publicationAttempts.get(eventKey) ?? 0) + 1
            );
            try {
              this.options.onPublicationError?.(eventKey, error);
            } catch {
              /* Logging cannot affect durability. */
            }
            this.schedulePublicationRetry(eventKey);
            throw error;
          }
        }
      })
      .finally(() => this.publicationFlights.delete(eventKey));
    this.publicationFlights.set(eventKey, flight);
    return flight;
  }

  deliveryHealth(eventKey: string): PlaybackDeliveryHealth {
    const lastDelivery = this.lastDeliveries.get(eventKey);
    return {
      configured: !!this.options.publish,
      pendingRevision: this.pendingPublications.get(eventKey)?.revision ?? null,
      attempts: this.publicationAttempts.get(eventKey) ?? 0,
      nextRetryAtUtc: this.nextPublicationRetries.get(eventKey) ?? null,
      lastDeliveredRevision: lastDelivery?.revision ?? null,
      lastDeliveredAtUtc: lastDelivery?.atUtc ?? null,
      error: this.publicationErrors.has(eventKey)
        ? String(this.publicationErrors.get(eventKey))
        : null
    };
  }

  /** Stops retry timers and gives every latest pending event one bounded final drain. */
  async shutdown(timeoutMs = 3_000): Promise<void> {
    this.closing = true;
    for (const timer of this.publicationRetryTimers.values()) clearTimeout(timer);
    this.publicationRetryTimers.clear();
    this.nextPublicationRetries.clear();

    const drain = Promise.allSettled(
      [...this.pendingPublications.keys()].map((eventKey) =>
        this.retryPublication(eventKey)
      )
    ).then(() => undefined);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      drain,
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, Math.max(0, timeoutMs));
      })
    ]);
    if (timeout) clearTimeout(timeout);
  }

  private error(error: unknown): GraphicsError {
    if (error instanceof PlaybackCoordinatorError)
      return graphicsErrorZod.parse(error.detail);
    const code =
      error && typeof error === 'object' && 'code' in error
        ? error.code
        : undefined;
    const parsed = graphicsErrorZod.safeParse({
      code,
      message: error instanceof Error ? error.message : 'Playback unavailable.',
      retryable: code === 'UNAVAILABLE'
    });
    return parsed.success
      ? parsed.data
      : {
          code: 'UNAVAILABLE',
          message:
            error instanceof Error ? error.message : 'Playback unavailable.',
          retryable: true
        };
  }

  private rejected(
    requestId: string,
    error: GraphicsError,
    state?: PlaybackState
  ): PlaybackAcknowledgment {
    return playbackAcknowledgmentZod.parse({
      ok: false,
      requestId,
      error,
      ...(state ? { state: clone(state) } : {})
    });
  }

  private apply(
    mutation: PlaybackMutation,
    draft: PlaybackState,
    context: PlaybackMutationContext
  ) {
    const result: unknown = mutation(draft, context);
    if (result && typeof result === 'object' && 'then' in result) {
      // Drain a mistakenly returned promise so its rejection cannot escape; never await it in this lock.
      void Promise.resolve(result).catch(() => {});
      throw new PlaybackCoordinatorError({
        code: 'INVALID_INPUT',
        message:
          'Playback mutations must be synchronous; calculate outside the mutation queue.',
        retryable: false
      });
    }
  }

  private async commit(
    previous: PlaybackState,
    draft: PlaybackState,
    requestId: string,
    command?: { fingerprint: string; type: PlaybackCommand['type'] }
  ): Promise<PlaybackAcknowledgment> {
    if (draft.eventKey !== previous.eventKey)
      throw new PlaybackCoordinatorError({
        code: 'INVALID_INPUT',
        message: 'A playback mutation cannot change event identity.',
        retryable: false
      });
    draft.revision = previous.revision + 1;
    draft.updatedAtUtc = this.now();
    draft.lastCommandId = requestId;
    const state = playbackStateZod.parse(clone(draft));
    const acknowledgment = playbackAcknowledgmentZod.parse({
      ok: true,
      requestId,
      state: clone(state),
      replayed: false
    });
    await this.options.storage.savePlayback(
      state.eventKey,
      clone(state),
      previous.revision,
      command
        ? {
            requestId,
            fingerprint: command.fingerprint,
            acknowledgment: clone(acknowledgment)
          }
        : undefined
    );
    this.states.set(state.eventKey, clone(state));
    if (
      command?.type === 'clear' ||
      command?.type === 'take' ||
      canonicalJson(previous.program) !== canonicalJson(state.program)
    )
      this.programEpochs.set(
        state.eventKey,
        (this.programEpochs.get(state.eventKey) ?? 0) + 1
      );
    this.queuePublication(state);
    return acknowledgment;
  }

  mutate(
    eventKey: string,
    input: PlaybackCommand,
    mutation: PlaybackMutation
  ): Promise<PlaybackAcknowledgment> {
    const command = playbackCommandZod.parse(input);
    const fingerprint = canonicalJson(clone(command));
    return this.serial(eventKey, async () => {
      let current: PlaybackState | undefined;
      try {
        current = await this.current(eventKey);
        const saved = await this.options.storage.loadCommand(
          eventKey,
          command.requestId
        );
        if (saved) {
          if (saved.fingerprint !== fingerprint)
            return this.rejected(
              command.requestId,
              {
                code: 'CONFLICT',
                message: 'Request ID was already used for a different command.',
                retryable: false
              },
              current
            );
          const acknowledgment = playbackAcknowledgmentZod.parse(
            clone(saved.acknowledgment)
          );
          return acknowledgment.ok
            ? { ...acknowledgment, replayed: true }
            : acknowledgment;
        }
        if (
          command.expectedRevision !== undefined &&
          command.expectedRevision !== current.revision
        )
          return this.rejected(
            command.requestId,
            {
              code: 'CONFLICT',
              message:
                'Playback revision changed; reload state before retrying.',
              retryable: true
            },
            current
          );
        const draft = clone(current);
        this.apply(mutation, draft, {
          nextRevision: current.revision + 1,
          now: this.now()
        });
        return await this.commit(current, draft, command.requestId, {
          fingerprint,
          type: command.type
        });
      } catch (error) {
        // A failed write must not update memory or publish the uncommitted draft.
        return this.rejected(command.requestId, this.error(error), current);
      }
    });
  }

  async beginPreparation(
    eventKey: string,
    command: PlaybackCommand,
    options: PreparationOptions
  ): Promise<PreparationAcceptance> {
    const spec = preparedGraphicSpecZod.parse(clone(options.spec));
    let ticket: PreparationTicket | null = null;
    let originalRevisionValue: number = -1;
    const acknowledgment = await this.mutate(
      eventKey,
      command,
      (draft, context) => {
        originalRevisionValue = draft.revision;
        const target = graphicsTargetZod.parse({
          targetId: this.newId(),
          targetRevision: context.nextRevision,
          requestId: command.requestId,
          snapshotId: options.snapshotId ?? null,
          index: options.index ?? null
        });
        if (options.updateState)
          this.apply(options.updateState, draft, context);
        if (options.lane === 'cue') {
          draft.cue = { status: 'calculating', target, spec };
        } else {
          const actual =
            options.destination === 'program'
              ? draft.program?.graphic.target
              : draft.cue.status === 'ready'
                ? draft.cue.graphic.target
                : undefined;
          if (!actual || !sameTarget(actual, options.origin))
            throw new PlaybackCoordinatorError({
              code: 'SUPERSEDED',
              message: 'Refresh target is no longer current.',
              retryable: false
            });
          draft.stagedUpdate = {
            status: 'calculating',
            destination: options.destination,
            origin: clone(options.origin),
            requestId: command.requestId
          };
        }
        ticket = {
          eventKey,
          requestId: command.requestId,
          lane: options.lane,
          target,
          spec: clone(spec),
          programEpoch: this.programEpochs.get(eventKey) ?? 0,
          originalRevision: originalRevisionValue,
          ...(options.lane === 'stagedUpdate'
            ? {
                destination: options.destination,
                origin: clone(options.origin)
              }
            : {})
        };
      }
    );
    if (!acknowledgment.ok || acknowledgment.replayed) ticket = null;
    return { acknowledgment, ticket };
  }

  private ticketCurrent(
    state: PlaybackState,
    ticket: PreparationTicket,
    protectProgram: boolean
  ) {
    if (
      protectProgram &&
      ticket.programEpoch !== this.programEpochs.get(ticket.eventKey)
    )
      return false;
    if (ticket.lane === 'cue')
      return (
        state.cue.status === 'calculating' &&
        sameTarget(state.cue.target, ticket.target)
      );
    const staged = state.stagedUpdate;
    if (
      staged.status !== 'calculating' ||
      staged.requestId !== ticket.requestId ||
      staged.destination !== ticket.destination ||
      !ticket.origin ||
      !sameTarget(staged.origin, ticket.origin)
    )
      return false;
    const actual =
      staged.destination === 'program'
        ? state.program?.graphic.target
        : state.cue.status === 'ready'
          ? state.cue.graphic.target
          : undefined;
    return !!actual && sameTarget(actual, ticket.origin);
  }

  /** Optional afterReady is a synchronous operation-module hook, e.g. an atomic quick-take promotion. */
  completePreparation(
    ticket: PreparationTicket,
    input: PreparedGraphic,
    afterReady?: PlaybackMutation
  ): Promise<PlaybackAcknowledgment> {
    return this.finish(
      ticket,
      async (draft, context) => {
        const graphic = snapshotPreparedGraphic(
          preparedGraphicZod.parse(input)
        );
        if (
          !sameTarget(graphic.target, ticket.target) ||
          canonicalJson(graphic.spec) !== canonicalJson(ticket.spec)
        )
          throw new PlaybackCoordinatorError({
            code: 'PRESENTATION_FAILED',
            message:
              'Prepared result does not match its requested target and spec.',
            retryable: false
          });
        if (ticket.lane === 'cue') draft.cue = { status: 'ready', graphic };
        else
          draft.stagedUpdate = {
            status: 'ready',
            destination: ticket.destination!,
            origin: ticket.origin!,
            graphic
          };
        if (afterReady) this.apply(afterReady, draft, context);
      },
      !!afterReady || ticket.destination === 'program'
    );
  }

  failPreparation(
    ticket: PreparationTicket,
    error: GraphicsError
  ): Promise<PlaybackAcknowledgment> {
    const failure = graphicsErrorZod.parse(error);
    return this.finish(
      ticket,
      async (draft) => {
        if (ticket.lane === 'cue')
          draft.cue = {
            status: 'failed',
            target: ticket.target,
            spec: ticket.spec,
            error: failure
          };
        else
          draft.stagedUpdate = {
            status: 'failed',
            destination: ticket.destination!,
            origin: ticket.origin!,
            requestId: ticket.requestId,
            error: failure
          };
      },
      ticket.destination === 'program'
    );
  }

  private finish(
    ticket: PreparationTicket,
    update: (
      draft: PlaybackState,
      context: PlaybackMutationContext
    ) => Promise<void>,
    protectProgram: boolean
  ): Promise<PlaybackAcknowledgment> {
    return this.serial(ticket.eventKey, async () => {
      let state: PlaybackState | undefined;
      try {
        state = await this.current(ticket.eventKey);
        if (!this.ticketCurrent(state, ticket, protectProgram))
          return this.rejected(
            ticket.requestId,
            {
              code: 'SUPERSEDED',
              message: 'Calculation target was superseded.',
              retryable: false
            },
            state
          );
        const draft = clone(state);
        await update(draft, {
          nextRevision: state.revision + 1,
          now: this.now()
        });
        return await this.commit(state, draft, ticket.requestId);
      } catch (error) {
        return this.rejected(ticket.requestId, this.error(error), state);
      }
    });
  }
}
