import { LiveGraphicState } from '@toa-lib/models';
import { useAtomCallback } from 'jotai/utils';
import { eventKeyAtom } from 'src/stores/state/event.js';
import {
  createEmptyLiveGraphicState,
  graphicsStateMapAtom
} from 'src/stores/state/graphics.js';

export type GraphicsStateEventPayload = LiveGraphicState & {
  eventKey?: string;
};

export const useGraphicsStateEvent = () => {
  return useAtomCallback((get, set, state: GraphicsStateEventPayload) => {
    const eventKey = state.eventKey ?? get(eventKeyAtom);
    if (!eventKey) return;

    const current =
      get(graphicsStateMapAtom)[eventKey] ?? createEmptyLiveGraphicState();

    // The server always broadcasts the FULL state, so a message with a
    // strictly lower generation than what we already have is stale/out of
    // order (e.g. redelivered after a newer one) and must be dropped.
    // Equal generations are still applied — the atom's initial value starts
    // at generation 0, so the very first real broadcast (also generation 0)
    // must not be rejected by a "<=" check, and this also lets a server
    // restart that resets its counter to 0 take effect once its counter
    // reaches (or ties) whatever generation we're currently holding.
    if (state.generation < current.generation) return;

    set(graphicsStateMapAtom, (prev) => ({
      ...prev,
      [eventKey]: state
    }));
  });
};
