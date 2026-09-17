import type { PlaybackDeliveryHealth } from '@toa-lib/models';
import { useSyncExternalStore } from 'react';

/**
 * The latest delivery health the API has told this browser about, per event.
 *
 * Written ONLY by answers to requests the producer made: every playback
 * command acknowledgment carries `delivery`, and the explicit Check / Retry
 * delivery actions return it too. Nothing here polls or schedules; see
 * `playbackDeliveryHealthZod` for what each status means.
 */
const byEvent = new Map<string, PlaybackDeliveryHealth>();
const listeners = new Set<() => void>();

export function recordPlaybackDelivery(
  health: PlaybackDeliveryHealth | null | undefined
): void {
  if (!health) return;
  byEvent.set(health.eventKey, health);
  for (const listener of listeners) listener();
}

export function getPlaybackDelivery(
  eventKey: string | null
): PlaybackDeliveryHealth | null {
  return eventKey ? (byEvent.get(eventKey) ?? null) : null;
}

export function usePlaybackDelivery(
  eventKey: string | null
): PlaybackDeliveryHealth | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => getPlaybackDelivery(eventKey)
  );
}

/** Test isolation only. */
export function resetPlaybackDelivery(): void {
  byEvent.clear();
  for (const listener of listeners) listener();
}
