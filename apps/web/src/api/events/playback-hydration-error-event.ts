import { playbackHydrationErrorZod } from '@toa-lib/models';
import { useAtomCallback } from 'jotai/utils';
import { playbackDeliveryMapAtom } from 'src/stores/state/graphics.js';

/**
 * Records that the relay could NOT hydrate this client
 * (`GraphicsSocketEvent.PLAYBACK_HYDRATION_ERROR_V1`).
 *
 * This is a diagnosis, never a state message: it carries no envelope, so it
 * must not touch `playbackEventStoreAtom`, must not affect envelope
 * ordering, and must not clear state an earlier delivery already
 * established. It only moves delivery out of the `hydrating` limbo that used
 * to be indistinguishable from "hydration failed", carrying the relay's own
 * reason so the operator is told which failure happened.
 *
 * A late failure for an event that has since hydrated (a socket envelope won
 * the race) is dropped: `ready` is the truth, and downgrading it would
 * disable a transport that is genuinely working.
 */
export const usePlaybackHydrationErrorEvent = () =>
  useAtomCallback((get, set, input: unknown) => {
    const parsed = playbackHydrationErrorZod.safeParse(input);
    if (!parsed.success) return null;
    const { eventKey, code, message } = parsed.data;

    const phase = get(playbackDeliveryMapAtom)[eventKey]?.phase;
    if (phase === 'ready' || phase === 'disconnected') return parsed.data;
    // A fallback read already in flight owns the phase; let it finish and
    // report, rather than flapping the producer's banner back and forth.
    if (phase === 'recovering') {
      set(playbackDeliveryMapAtom, (previous) => ({
        ...previous,
        [eventKey]: {
          phase: 'recovering',
          error: code ? `${code}: ${message}` : message
        }
      }));
      return parsed.data;
    }

    set(playbackDeliveryMapAtom, (previous) => ({
      ...previous,
      [eventKey]: {
        phase: 'failed',
        error: code ? `${code}: ${message}` : message
      }
    }));
    // The last complete state, if any, stays exactly as it was.
    return parsed.data;
  });
