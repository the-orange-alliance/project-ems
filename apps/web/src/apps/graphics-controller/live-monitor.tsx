import { useAtomValue } from 'jotai';
import { FC } from 'react';
import { palette } from '../audience-display/displays/graphics/theme.js';
import { StatsGraphicDisplay } from '../audience-display/displays/graphics/stats-graphic-display.js';
import { eventKeyAtom } from '../../stores/state/event.js';
import {
  createEmptyLiveGraphicState,
  graphicsStateMapAtom
} from '../../stores/state/graphics.js';

// A fixed-size box the shared `Stage` (see `composition.tsx`) scales the
// 1920x1080 broadcast canvas into. Sizing lives entirely in `Stage` now —
// this is just how big the monitor box on screen is.
const MONITOR_WIDTH = 340;
const MONITOR_HEIGHT = Math.round((MONITOR_WIDTH * 1080) / 1920);

/**
 * A 16:9 preview box, pinned to the bottom-left of the viewport and always
 * visible regardless of scroll position, showing exactly what the audience
 * display is currently putting to air.
 *
 * Renders through the SAME `Stage`/container/`GraphicRenderer` composition
 * the on-air audience display uses (see `apps/web/src/apps/audience-display/
 * displays/graphics/{composition,containers,renderers}`) — chosen by
 * `spec.mode` exactly like `stats-graphic-display.tsx` does, with no
 * simplified/"compact" alternate rendering path. That shared code path,
 * not a second implementation, is what guarantees this box never lies to
 * the producer about what is actually on the broadcast: same title/subtitle
 * chrome, same safe margins, same colors, just scaled into a smaller box —
 * enter/exit transitions included, since it's the exact same component
 * (`StatsGraphicDisplay`) driving both, not a settled-state-only snapshot.
 *
 * Reads `liveGraphicStateAtom` only - the same jotai atom the socket layer
 * (`useGraphicsStateEvent`, wired up in `connection-manager.tsx`) keeps
 * current on every `graphics:state` broadcast. No fetch, no polling: this
 * component is purely reactive to state that already exists.
 */
export const LiveMonitor: FC = () => {
  const eventKey = useAtomValue(eventKeyAtom);
  const graphicsStateMap = useAtomValue(graphicsStateMapAtom);
  const liveState =
    eventKey && graphicsStateMap[eventKey]
      ? graphicsStateMap[eventKey]
      : createEmptyLiveGraphicState();
  const onAir = liveState.onAir && !!liveState.spec && !!liveState.frame;

  return (
    <div
      role='status'
      aria-live='polite'
      aria-label={
        onAir
          ? 'Current audience graphic on air'
          : 'Current audience graphic off air'
      }
      style={{
        position: 'fixed',
        left: 16,
        bottom: 16,
        width: MONITOR_WIDTH,
        height: MONITOR_HEIGHT,
        background: palette.panelBackground,
        border: `2px solid ${onAir ? 'var(--ant-color-error)' : palette.panelBorder}`,
        borderRadius: 10,
        overflow: 'hidden',
        zIndex: 1000,
        boxShadow: '0 10px 28px rgba(0, 0, 0, 0.42)'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: 8,
          right: 8,
          zIndex: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 1,
          color: onAir ? '#ff4d4f' : 'rgba(255, 255, 255, 0.72)'
        }}
      >
        <span>{onAir ? 'LIVE' : 'OFF AIR'}</span>
        <span style={{ opacity: 0.8 }}>
          {eventKey ? 'event-scoped' : 'waiting for event'}
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'transparent'
        }}
      >
        <StatsGraphicDisplay spec={liveState.spec} frame={liveState.frame} />
      </div>
    </div>
  );
};

export default LiveMonitor;
