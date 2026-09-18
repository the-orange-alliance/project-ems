import type { Getter, Setter } from 'jotai';
import { useAtomCallback } from 'jotai/utils';
import {
  applyPlaybackEnvelope,
  playbackDeliveryMapAtom,
  playbackEventStoreAtom
} from 'src/stores/state/graphics.js';

/**
 * The handler itself, hoisted to module scope.
 *
 * `useAtomCallback` memoizes on the identity of the function it is given, so
 * an inline arrow makes it return a NEW setter on every render. That setter
 * is a dependency of `ConnectionManager`'s socket effect, which re-ran the
 * effect - and therefore re-emitted `graphics:subscribe`, and therefore made
 * the relay re-read `/live/state/v1` - on every render, while the subscribe's
 * own `hydrating` write caused the next render. That is the request storm.
 * This closes over nothing render-scoped, so module scope is its right home.
 */
const applyPlaybackStateEvent = (get: Getter, set: Setter, input: unknown) => {
  const eventKey =
    input && typeof input === 'object' && 'eventKey' in input
      ? (input as { eventKey?: unknown }).eventKey
      : undefined;
  const current =
    typeof eventKey === 'string'
      ? get(playbackEventStoreAtom)[eventKey]
      : undefined;
  const decision = applyPlaybackEnvelope(current, input);

  if (!decision.accepted) {
    if (decision.reason === 'invalid' && typeof eventKey === 'string')
      set(playbackDeliveryMapAtom, (previous) => ({
        ...previous,
        [eventKey]: {
          // An invalid envelope arriving while this client has never
          // hydrated IS a failed hydration - leaving it in `hydrating`
          // is the limbo that wedged the producer. A client that already
          // holds valid state keeps `ready` and merely exposes the error:
          // what is on air is still authoritative and still controllable.
          phase:
            previous[eventKey]?.phase === 'ready'
              ? 'ready'
              : previous[eventKey]?.phase === 'disconnected'
                ? 'disconnected'
                : 'failed',
          error: decision.error ?? 'Invalid playback state envelope'
        }
      }));
    return decision;
  }

  const acceptedEventKey = decision.record.envelope.eventKey;
  set(playbackEventStoreAtom, (previous) => ({
    ...previous,
    [acceptedEventKey]: decision.record
  }));
  set(playbackDeliveryMapAtom, (previous) => ({
    ...previous,
    [acceptedEventKey]: { phase: 'ready', error: null }
  }));
  return decision;
};

/** Applies one strict, event-scoped authoritative full snapshot. */
export const usePlaybackStateEvent = () =>
  useAtomCallback(applyPlaybackStateEvent);
