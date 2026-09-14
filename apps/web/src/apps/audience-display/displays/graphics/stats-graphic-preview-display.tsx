import type { CSSProperties, FC } from 'react';
import type { GraphicSpec, VizFrame } from '@toa-lib/models';

import { PreviewNotReadyAlarm } from './preview-not-ready-alarm.js';
import { StatsGraphicDisplay } from './stats-graphic-display.js';
import { fontFamily } from './theme.js';
import { usePreviewFrame } from './use-preview-frame.js';
import { usePreviewReplayNonce } from './use-preview-replay-nonce.js';

export interface StatsGraphicPreviewDisplayProps {
  eventKey: string | null;
  /** The item one step ahead of the program - `LiveGraphicState.previewSpec`. */
  spec: GraphicSpec | null;
  /**
   * What is on the program bus right now - `LiveGraphicState.spec`/`.frame`.
   * Used ONLY as the starting point of a replay: the transition this screen
   * previews is the one FROM the on-air graphic INTO this one, so a replay
   * cuts back to it first. Both null means nothing is on air, and a replay
   * correctly becomes a cut-to-black plus an entrance.
   */
  programSpec?: GraphicSpec | null;
  programFrame?: VizFrame | null;
}

/** Multiviewer red. Deliberately a literal rather than an antd token: this screen renders outside any ConfigProvider and often in OBS. */
const PREVIEW_RED = '#ff4d4f';
const BORDER_WIDTH = 4;

const labelStyle: CSSProperties = {
  background: PREVIEW_RED,
  color: '#fff',
  fontFamily,
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: 4,
  textTransform: 'uppercase',
  textAlign: 'center',
  lineHeight: 1.6,
  padding: '2px 0',
  flex: '0 0 auto',
  // Chrome, never content: it must not intercept a click, and it must not
  // be picked up by anything measuring the graphic area.
  pointerEvents: 'none',
  userSelect: 'none'
};

/**
 * The preview (PVW) bus to `StatsGraphicDisplay`'s program (PGM) bus:
 * whatever graphic is one step ahead of what the audience is currently
 * seeing, rendered exactly as it will look once it is taken to air.
 *
 * Renders through the SAME `StatsGraphicDisplay` component the on-air screen
 * uses - same containers, same renderers, same enter/exit transitions - so
 * this is a true preview of the real thing rather than a second, subtly
 * different rendering path. The only difference is where the data comes
 * from: the program's frame is calculated and persisted server-side, while
 * the next item is unprepared and is calculated here instead (see
 * `usePreviewFrame`).
 *
 * WHY THIS ONE HAS CHROME AND THE ON-AIR SCREEN MUST NOT:
 * This screen never goes to air, so it is wrapped in a red border and
 * labelled PREVIEW the way a multiviewer tile is - unmistakably not the
 * program feed. That chrome lives HERE, outside `StatsGraphicDisplay`, for
 * two reasons: it must never leak onto the program bus, and it has to stay
 * on screen even when there is no graphic at all (a blank monitor with no
 * frame or label is indistinguishable from a dead one).
 *
 * The chrome is the ONLY thing this adds - there is no background fill, so
 * the screen remains just as transparent as the on-air source and can be
 * composited over live video the same way.
 */
export const StatsGraphicPreviewDisplay: FC<
  StatsGraphicPreviewDisplayProps
> = ({ eventKey, spec, programSpec, programFrame }) => {
  const { result: preview, failure } = usePreviewFrame(eventKey, spec);
  // Bumped when the producer presses "Replay in Preview" - replays the
  // transition without re-querying, since the data has not changed.
  const replayNonce = usePreviewReplayNonce(eventKey);

  // Only a complete program graphic can be cut back to; a spec with no
  // frame (or vice versa) would render as nothing and make the replay look
  // like it started from black.
  const replayFrom =
    programSpec && programFrame
      ? { spec: programSpec, frame: programFrame }
      : null;

  return (
    <div
      role='region'
      aria-label='Graphics preview'
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        border: `${BORDER_WIDTH}px solid ${PREVIEW_RED}`,
        // Deliberately NO background fill. Only the frame and its two labels
        // paint, so this stays a transparent source like the on-air screen
        // and can be composited over live video - the chrome marks the tile
        // as preview without covering whatever is behind it.
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      <div style={labelStyle}>Preview</div>

      {/*
        The graphic area. `position: relative` + `flex: 1` gives it a real,
        resolved containing block, which `Stage` REQUIRES: it measures its
        host and falls back to the whole window when that host never
        resolves a box (see `composition.tsx`), which here would scale the
        graphic to the viewport and overflow the chrome. Being slightly
        shorter than 16:9 once the two label bars are subtracted is fine -
        `Stage` letterboxes rather than stretching.
      */}
      <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0 }}>
        {/*
          `preview.spec` (resolved), never the raw `spec` prop: the two must
          describe the same graphic for the transition engine to diff them
          correctly - see the `spec`/`frame` lockstep note in
          `stats-graphic-display.tsx`.
        */}
        <StatsGraphicDisplay
          spec={preview?.spec ?? null}
          frame={preview?.frame ?? null}
          replayNonce={replayNonce}
          replayFrom={replayFrom}
        />

        {/*
          The next cue cannot be prepared, so a Go will put nothing on air.
          Rendered INSIDE the graphic area (above `StatsGraphicDisplay`, which
          has already rendered nothing for this item) so the alarm stays within
          the preview chrome rather than covering the PREVIEW label bars that
          identify this tile as off-air.
        */}
        {failure && <PreviewNotReadyAlarm reason={failure.reason} />}
      </div>

      <div style={labelStyle}>Preview</div>
    </div>
  );
};

export default StatsGraphicPreviewDisplay;
