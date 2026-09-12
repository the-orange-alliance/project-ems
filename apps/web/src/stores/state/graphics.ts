import { LiveGraphicState } from '@toa-lib/models';
import { atom } from 'jotai';
import { eventKeyAtom } from './event.js';

export const createEmptyLiveGraphicState = (): LiveGraphicState => ({
  timelineId: null,
  index: 0,
  spec: null,
  frame: null,
  onAir: false,
  generation: 0,
  queueEntryId: null,
  armed: false,
  values: null,
  previewSpec: null
});

export const graphicsStateMapAtom = atom<Record<string, LiveGraphicState>>({});

/**
 * The most recent preview-replay request per event key, as the monotonic
 * `replayId` the relay issued (see `GraphicsPreviewReplay`). Purely a
 * signal - it holds no graphic and never affects what is on air; only
 * preview (PVW) screens read it.
 *
 * Consumers must treat the value they see on mount as a BASELINE rather
 * than a request, because the socket layer replays an event's last payload
 * to every newly-attached listener (see `event-bus.ts`) - otherwise a
 * preview window would replay its animation every time it is opened or
 * reloaded. `usePreviewReplayNonce` is the hook that gets this right.
 */
export const graphicsPreviewReplayAtom = atom<Record<string, number>>({});

export const liveGraphicStateAtom = atom((get) => {
  const eventKey = get(eventKeyAtom);
  const stateMap = get(graphicsStateMapAtom);

  if (!eventKey) {
    return createEmptyLiveGraphicState();
  }

  return stateMap[eventKey] ?? createEmptyLiveGraphicState();
});
