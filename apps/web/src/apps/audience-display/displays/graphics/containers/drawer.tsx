import { type FC, type ReactNode } from 'react';
import { palette, overlayCardStyle, textStrokeStyle } from '../theme.js';
import { Stage, vh, vw } from '../composition.js';

/**
 * Vertical panel presentation container for `mode: 'drawer-left'` /
 * `'drawer-right'` graphics. Anchored to the given edge, full height, sized
 * to a fraction of the 1920x1080 design canvas so it reads as a "drawer"
 * sitting beside the live video rather than covering it.
 *
 * SPLIT INTO A SHELL AND A PAYLOAD:
 * `DrawerShell` is the drawer itself — the glass panel, its edge anchoring,
 * its padding. `DrawerPayload` is everything that belongs to the GRAPHIC
 * inside it: the title/subtitle chrome and the rendered content. They are
 * separate components because a same-`mode` change dissolves one graphic
 * into the next (see `content-crossfade.tsx`) with the drawer itself
 * holding perfectly still: exactly one shell is mounted, with two payloads
 * stacked inside it mid-dissolve. Keeping the chrome inside the payload is
 * what makes the title/subtitle dissolve WITH its graphic instead of
 * snapping to the incoming text while the body fades. Crossfading whole
 * shells instead would stack two translucent glass panels and two
 * `backdrop-filter` blurs, visibly changing the panel's own density
 * mid-transition.
 *
 * Mounts the shared `Stage` (see `fullscreen.tsx` for why) and anchors
 * itself to the canvas edge in design-space `vw`/`vh` units from
 * `composition.ts` — percentages of the fixed 1920x1080 canvas, not the
 * viewport — so the drawer's width/position stay proportionally identical
 * whether this renders full-size on air or scaled down in the producer
 * monitor.
 *
 * Uses the shared glassmorphic `overlayCardStyle` layered over an explicit
 * dark `scrim`, so title/body text stays legible over arbitrary,
 * unpredictable video underneath — this is composited as a transparent
 * broadcast source, there is no guaranteed dark background to rely on.
 *
 * NOTE: only ever renders `title`/`subtitle` + `children`. Never wire
 * `frame.warnings` / `frame.quality` / `frame.notes` into this component —
 * those are producer-facing only and must never reach air.
 */
export interface DrawerShellProps {
  side: 'left' | 'right';
  children: ReactNode;
}

// ~30-36vw wide, per spec — expressed as % of the 1920px design canvas.
const DRAWER_WIDTH_PCT = 33;

export const DrawerShell: FC<DrawerShellProps> = ({ side, children }) => {
  // Square off the screen-edge corners, round only the inward edge (the one
  // butting up against the live video rather than the screen edge).
  const inwardRadius = '1.25rem';
  const cornerRadii =
    side === 'left'
      ? {
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          borderTopRightRadius: inwardRadius,
          borderBottomRightRadius: inwardRadius
        }
      : {
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          borderTopLeftRadius: inwardRadius,
          borderBottomLeftRadius: inwardRadius
        };

  return (
    <Stage>
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          [side]: 0,
          width: vw(DRAWER_WIDTH_PCT),
          height: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: `${vh(3)}px ${vw(2)}px ${vh(2.5)}px`,
          color: palette.textPrimary,
          // `overlayCardStyle` first (blur/shadow/border), then an explicit
          // dark scrim on top of its own default fill — belt-and-suspenders
          // legibility over arbitrary, unpredictable live video.
          ...overlayCardStyle,
          backgroundColor: palette.scrim,
          ...cornerRadii
        }}
      >
        {/* The payload host: a real, positioned box filling the panel's
            padded content area, so stacked `StageLayer`s (`position:
            absolute; inset: 0`) resolve against it rather than against the
            panel's padding box. */}
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

export interface DrawerPayloadProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export const DrawerPayload: FC<DrawerPayloadProps> = ({
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
      gap: vh(1.2),
      minHeight: 0,
      minWidth: 0
    }}
  >
    {(title || subtitle) && (
      <div style={{ flex: '0 0 auto' }}>
        {title && (
          <div
            title={title}
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              ...textStrokeStyle,
              fontSize: vh(2.6),
              fontWeight: 700,
              lineHeight: 1.15
            }}
          >
            {title}
          </div>
        )}
        {subtitle && (
          <div
            title={subtitle}
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              lineHeight: 1.2,
              ...textStrokeStyle,
              color: palette.textSecondary,
              fontSize: vh(1.6),
              marginTop: vh(0.4)
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
