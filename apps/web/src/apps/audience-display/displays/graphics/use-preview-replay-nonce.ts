import { useAtomValue } from 'jotai';
import { useEffect, useRef, useState } from 'react';
import { graphicsPreviewReplayAtom } from 'src/stores/state/graphics.js';

/**
 * Turns the relay's broadcast preview-replay requests into a local counter
 * that `useGraphicTransition` can key an animation replay off.
 *
 * The subtlety this exists for: the socket layer replays an event's LAST
 * payload to every newly-attached listener (see `event-bus.ts`), so the
 * atom is very often already populated by the time a preview screen mounts
 * - with a request that was served minutes ago to a different window.
 * Reacting to the raw value would make every preview window replay its
 * animation on open, on reload, and on any remount.
 *
 * So whatever is present on mount is recorded as a BASELINE and deliberately
 * ignored; only a value that changes afterwards - a genuinely new request,
 * arriving while this screen was already watching - increments the returned
 * nonce. Starting at 0 also means the very first render never looks like a
 * replay to the transition engine.
 */
export const usePreviewReplayNonce = (
  eventKey: string | null | undefined
): number => {
  const replayIds = useAtomValue(graphicsPreviewReplayAtom);
  const replayId = eventKey ? (replayIds[eventKey] ?? null) : null;

  const [nonce, setNonce] = useState(0);
  // `undefined` distinguishes "no baseline captured yet" from a captured
  // baseline of `null` (no replay has ever been broadcast for this event).
  const baselineRef = useRef<number | null | undefined>(undefined);
  // Which event the baseline belongs to. Switching events swaps in a
  // completely unrelated event's `replayId`, which would otherwise read as
  // a brand-new request and fire a replay nobody asked for.
  const baselineKeyRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const key = eventKey ?? null;
    if (baselineRef.current === undefined || baselineKeyRef.current !== key) {
      baselineKeyRef.current = key;
      baselineRef.current = replayId;
      return;
    }
    if (replayId === baselineRef.current) return;
    baselineRef.current = replayId;
    // A replay is only ever a request to animate something; there is
    // nothing to replay back to, so this never counts down.
    setNonce((n) => n + 1);
  }, [replayId, eventKey]);

  return nonce;
};
