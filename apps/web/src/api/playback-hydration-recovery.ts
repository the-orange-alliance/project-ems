import { useCallback } from 'react';
import { useAtomCallback } from 'jotai/utils';
// Imported by the same `src/...` specifier the rest of the app uses, not a
// relative one: the web suite runs in a single shared VM, where the two
// specifiers can resolve to two module instances and a test's mock would
// then apply to only one of them.
import { graphicsApi } from 'src/api/use-graphics-data.js';
import { usePlaybackStateEvent } from 'src/api/events/playback-state-event.js';
import {
  playbackDeliveryMapAtom,
  type PlaybackEnvelopeDecision
} from 'src/stores/state/graphics.js';

/**
 * Milliseconds to wait before each automatic attempt.
 *
 * Bounded on purpose. The socket is and stays the normal delivery path; this
 * is a rescue for a hydration that failed, not a poll. Three attempts inside
 * ~4s covers the realistic case - the API was restarting while the relay
 * tried to read it - without turning every open producer tab into a
 * background load on an authority that is genuinely down. When the attempts
 * run out the operator gets a named failure and a button, which is the
 * honest answer.
 */
export const HYDRATION_RECOVERY_BACKOFF_MS = [0, 750, 3000] as const;

/**
 * One in-flight recovery per event key, shared by every caller that can
 * start one (the automatic effect in `ConnectionManager` and the producer's
 * manual Retry). This is what makes Retry single-flight and idempotent:
 * pressing it twice quickly - or pressing it while automatic attempts are
 * still running - joins the existing attempt instead of issuing a second
 * read.
 */
const inFlight = new Map<string, Promise<boolean>>();

/** Test seam: no recovery may leak from one test into the next. */
export const resetPlaybackHydrationRecovery = (): void => inFlight.clear();

const describeError = (error: unknown): string =>
  error instanceof Error && error.message.length > 0
    ? error.message
    : String(error);

/**
 * A sleep that leaves NOTHING behind when abandoned - the timer is cleared on
 * abort rather than being left to fire into an unmounted tree.
 */
const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (ms <= 0 || signal.aborted) {
      resolve();
      return;
    }
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener('abort', finish, { once: true });
  });

export interface HydrationRecoveryHandle {
  /**
   * Runs bounded, backed-off authoritative reads until this browser holds
   * authoritative state again; resolves true when it does.
   *
   * `signal` is checked before every read and before every store write, so a
   * response that lands after unmount, a disconnect or an event change is
   * discarded rather than applied.
   */
  recover: (
    eventKey: string,
    options?: { attempts?: number; signal?: AbortSignal }
  ) => Promise<boolean>;
}

export const usePlaybackHydrationRecovery = (): HydrationRecoveryHandle => {
  const applyEnvelope = usePlaybackStateEvent();

  const runAttempts = useAtomCallback(
    useCallback(
      async (
        get,
        set,
        {
          eventKey,
          attempts,
          signal
        }: { eventKey: string; attempts: number; signal: AbortSignal }
      ): Promise<boolean> => {
        const phaseOf = () => get(playbackDeliveryMapAtom)[eventKey]?.phase;
        // A socket envelope that landed mid-flight wins by the normal rules:
        // a delivery that became `ready` is never downgraded by this path.
        const setPhase = (next: {
          phase: 'recovering' | 'failed';
          error: string | null;
        }): void =>
          set(playbackDeliveryMapAtom, (previous) => ({
            ...previous,
            [eventKey]:
              previous[eventKey]?.phase === 'ready' ? previous[eventKey] : next
          }));

        let lastError = 'Authoritative playback state could not be read.';
        for (let attempt = 0; attempt < attempts; attempt++) {
          if (signal.aborted) return false;
          if (phaseOf() === 'ready') return true;

          await sleep(
            HYDRATION_RECOVERY_BACKOFF_MS[
              Math.min(attempt, HYDRATION_RECOVERY_BACKOFF_MS.length - 1)
            ],
            signal
          );
          if (signal.aborted) return false;
          if (phaseOf() === 'ready') return true;

          setPhase({
            phase: 'recovering',
            error: get(playbackDeliveryMapAtom)[eventKey]?.error ?? null
          });

          try {
            const envelope =
              await graphicsApi.live.authoritativeState(eventKey);
            if (signal.aborted) return false;
            if (!envelope) {
              lastError = 'The graphics API returned no playback state.';
              continue;
            }
            // Event isolation: a response for an event this client no longer
            // wants is discarded outright, never written under another key.
            if (envelope.eventKey !== eventKey) {
              lastError = `The graphics API answered for ${envelope.eventKey}, not ${eventKey}.`;
              continue;
            }
            // Ordering is NOT special-cased here. The fallback goes through
            // exactly the same acceptance as a socket delivery, so
            // first/newer/equal-replay/new-epoch/stale/retired-epoch decide
            // identically and a late response cannot regress newer state.
            const decision = (await applyEnvelope(
              envelope
            )) as PlaybackEnvelopeDecision;
            if (decision.accepted) return true;
            // `stale` means a socket envelope beat this read to the store -
            // that IS a recovered delivery, just not by this path.
            if (decision.reason === 'stale' && phaseOf() === 'ready')
              return true;
            lastError =
              decision.reason === 'invalid'
                ? (decision.error ?? 'Invalid playback state envelope.')
                : `The graphics API answered with a ${decision.reason} envelope.`;
          } catch (error) {
            if (signal.aborted) return false;
            lastError = describeError(error);
          }
        }

        if (phaseOf() === 'ready') return true;
        if (!signal.aborted) setPhase({ phase: 'failed', error: lastError });
        return false;
      },
      [applyEnvelope]
    )
  );

  const recover = useCallback(
    (
      eventKey: string,
      options: { attempts?: number; signal?: AbortSignal } = {}
    ): Promise<boolean> => {
      const existing = inFlight.get(eventKey);
      if (existing) return existing;
      const signal = options.signal ?? new AbortController().signal;
      const run: Promise<boolean> = runAttempts({
        eventKey,
        attempts: options.attempts ?? HYDRATION_RECOVERY_BACKOFF_MS.length,
        signal
      }).finally(release);
      // Abandoning a run releases the slot immediately rather than waiting
      // for it to unwind, so the next subscribe is never coalesced into a
      // recovery that has already been cancelled. Identity-checked so a
      // late abort cannot evict a newer run.
      function release() {
        if (inFlight.get(eventKey) === run) inFlight.delete(eventKey);
      }
      signal.addEventListener('abort', release, { once: true });
      inFlight.set(eventKey, run);
      return run;
    },
    [runAttempts]
  );

  return { recover };
};
