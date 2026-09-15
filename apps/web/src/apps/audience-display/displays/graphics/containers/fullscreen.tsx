import { type FC, type ReactNode, type CSSProperties } from 'react';
import { palette, textStrokeStyle } from '../theme.js';
import { Stage, vh, vw } from '../composition.js';

/**
 * FGC 2026's branded backdrop for full-bleed graphics - a static blue/green
 * key-art plate (not the shared drifting brand gradient other seasons might
 * use) living in `public/` so it's served verbatim at this absolute path
 * regardless of route.
 */
const FULLSCREEN_BACKGROUND_URL =
  '/season-specific/2026fgc/blue_green_bg_blank.jpg';

const fullscreenBackgroundCss: CSSProperties = {
  backgroundImage: `url(${FULLSCREEN_BACKGROUND_URL})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
};

/**
 * Full-bleed presentation container for `mode: 'fullscreen'` graphics.
 *
 * Split into `FullscreenShell` (the static background plate) and
 * `FullscreenPayload` (the graphic's chrome + content) for the same reason
 * as `DrawerShell`/`DrawerPayload` — see `drawer.tsx`: a same-`mode` change
 * dissolves two payloads inside ONE motionless shell, so the title/subtitle
 * dissolve with their own graphic rather than snapping.
 *
 * Mounts the shared `Stage` (a fixed 1920x1080 design canvas, uniformly
 * scaled to fill whatever box this container is rendered into) and owns
 * this mode's title/subtitle chrome and safe margins in design-space units
 * (`vh`/`vw` from `composition.ts` — percentages of the fixed 1920x1080
 * canvas, NOT viewport units) so every consumer — the on-air audience
 * display, the producer's live monitor, and an editor preview — inherits
 * pixel-identical proportions regardless of the host box's actual size.
 *
 * Background is FGC 2026's static blue/green key-art plate
 * (`FULLSCREEN_BACKGROUND_URL` above), not the shared drifting brand
 * gradient other containers in this module might use.
 *
 * NOTE: this component (like the other two containers) only ever renders
 * `title`/`subtitle` plus whatever `children` the caller passes — it must
 * never be handed `frame.warnings` / `frame.quality` / `frame.notes`, which
 * are producer-facing only and must never reach air.
 */
export interface FullscreenShellProps {
  children: ReactNode;
}

export const FullscreenShell: FC<FullscreenShellProps> = ({ children }) => {
  return (
    <Stage>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          ...fullscreenBackgroundCss
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

export interface FullscreenPayloadProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export const FullscreenPayload: FC<FullscreenPayloadProps> = ({
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
      minHeight: 0,
      minWidth: 0
    }}
  >
    {(title || subtitle) && (
      <div
        style={{
          flex: '0 0 auto',
          padding: `${vh(3.5)}px ${vw(4)}px 0 ${vw(4)}px`,
          color: palette.textPrimary
        }}
      >
        {title && (
          <div
            title={title}
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              ...textStrokeStyle,
              fontSize: vh(4.2),
              fontWeight: 700,
              lineHeight: 1.1
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
              fontSize: vh(2.2),
              marginTop: vh(0.5)
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    )}
    <div
      style={{
        flex: '1 1 auto',
        minHeight: 0,
        minWidth: 0,
        padding: `${vh(1.5)}px ${vw(4)}px ${vh(3.5)}px ${vw(4)}px`,
        boxSizing: 'border-box'
      }}
    >
      {children}
    </div>
  </div>
);
