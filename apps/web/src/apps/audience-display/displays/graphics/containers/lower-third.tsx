import { type FC, type ReactNode } from 'react';
import { palette, overlayCardStyle, textStrokeStyle } from '../theme.js';
import { Stage, vh, vw } from '../composition.js';

/**
 * Bottom-anchored presentation container for `mode: 'lower-third'` graphics.
 * Roughly 22-28% of canvas height. Defaults to a centered ~80%-width band
 * (reads as a discrete graphic "card" over the video); pass `variant="full"`
 * for an edge-to-edge bar instead.
 *
 * Split into `LowerThirdShell` (the band itself) and `LowerThirdPayload`
 * (the graphic's chrome + content) for the same reason as
 * `DrawerShell`/`DrawerPayload` — see `drawer.tsx`: a same-`mode` change
 * dissolves two payloads inside ONE motionless shell.
 *
 * Mounts the shared `Stage` (see `fullscreen.tsx` for why) and anchors
 * itself to the canvas edge in design-space `vw`/`vh` units from
 * `composition.ts` — percentages of the fixed 1920x1080 canvas, not the
 * viewport — matching `DrawerShell`/`FullscreenShell`.
 *
 * Uses the shared glassmorphic `overlayCardStyle` layered over a dark
 * `scrim`, matching `DrawerShell`/`FullscreenShell`, for legibility over
 * arbitrary live video.
 *
 * NOTE: only ever renders `title`/`subtitle` + `children`. Never wire
 * `frame.warnings` / `frame.quality` / `frame.notes` into this component —
 * those are producer-facing only and must never reach air.
 */
export interface LowerThirdShellProps {
  children: ReactNode;
  variant?: 'band' | 'full';
}

// ~22-28% of canvas height, per spec.
const LOWER_THIRD_HEIGHT_PCT = 25;
const BAND_SIDE_MARGIN_PCT = 10; // (100 - 80) / 2, for the ~80% centered band.

export const LowerThirdShell: FC<LowerThirdShellProps> = ({
  children,
  variant = 'band'
}) => {
  const isFull = variant === 'full';

  return (
    <Stage>
      <div
        style={{
          position: 'absolute',
          bottom: isFull ? 0 : vh(3),
          left: isFull ? 0 : vw(BAND_SIDE_MARGIN_PCT),
          right: isFull ? 0 : vw(BAND_SIDE_MARGIN_PCT),
          height: vh(LOWER_THIRD_HEIGHT_PCT),
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: `${vh(1.6)}px ${vw(3)}px ${vh(1.8)}px`,
          color: palette.textPrimary,
          backgroundColor: palette.scrim,
          ...overlayCardStyle,
          borderRadius: isFull ? 0 : '1.5rem'
        }}
      >
        {/* See the identical host in `drawer.tsx` — gives stacked
            `StageLayer`s a real box to resolve `inset: 0` against. */}
        <div
          style={{
            position: 'relative',
            flex: '1 1 auto',
            minHeight: 0,
            minWidth: 0
          }}
        >
          {children}
        </div>
      </div>
    </Stage>
  );
};

export interface LowerThirdPayloadProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export const LowerThirdPayload: FC<LowerThirdPayloadProps> = ({
  children,
  title,
  subtitle
}) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: vh(0.8),
      minHeight: 0,
      minWidth: 0
    }}
  >
    {(title || subtitle) && (
      <div style={{ flex: '0 0 auto' }}>
        {title && (
          <div
            style={{
              ...textStrokeStyle,
              fontSize: vh(2.4),
              fontWeight: 700,
              lineHeight: 1.15
            }}
          >
            {title}
          </div>
        )}
        {subtitle && (
          <div
            style={{
              ...textStrokeStyle,
              color: palette.textSecondary,
              fontSize: vh(1.5),
              marginTop: vh(0.3)
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    )}
    <div style={{ flex: '1 1 auto', minHeight: 0, minWidth: 0 }}>
      {children}
    </div>
  </div>
);
