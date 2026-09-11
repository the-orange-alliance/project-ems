import type { GraphicsPreviewReplay } from '@toa-lib/models';
import { useAtomCallback } from 'jotai/utils';
import { eventKeyAtom } from 'src/stores/state/event.js';
import { graphicsPreviewReplayAtom } from 'src/stores/state/graphics.js';

export const useGraphicsPreviewReplayEvent = () => {
  return useAtomCallback(
    (get, set, payload: Partial<GraphicsPreviewReplay> | undefined) => {
      const eventKey = payload?.eventKey ?? get(eventKeyAtom);
      const replayId = payload?.replayId;
      if (!eventKey || typeof replayId !== 'number') return;

      // Same rationale as `useGraphicsStateEvent`'s `generation` check: the
      // relay issues a strictly increasing `replayId`, so anything not newer
      // than what we already hold is a stale redelivery and must not be
      // allowed to trigger a second animation.
      const current = get(graphicsPreviewReplayAtom)[eventKey];
      if (current !== undefined && replayId <= current) return;

      set(graphicsPreviewReplayAtom, (prev) => ({
        ...prev,
        [eventKey]: replayId
      }));
    }
  );
};
