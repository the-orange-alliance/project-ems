import { useAtomCallback } from 'jotai/utils';
import {
  applyPlaybackEnvelope,
  playbackDeliveryMapAtom,
  playbackEventStoreAtom
} from 'src/stores/state/graphics.js';

/** Applies one strict, event-scoped authoritative full snapshot. */
export const usePlaybackStateEvent = () =>
  useAtomCallback((get, set, input: unknown) => {
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
            phase: previous[eventKey]?.phase ?? 'hydrating',
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
  });
