import {
  type CSSProperties,
  type FC,
  type ReactNode,
  useEffect,
  useRef,
  useState
} from 'react';
import type { GraphicKind, PresentationMode } from '@toa-lib/models';
import { SUPPORTED_GRAPHIC_MODES } from '@toa-lib/models';
import { fontFamily, palette, textStrokeStyle } from './theme.js';

/**
 * THE shared 1920x1080 broadcast composition stage.
 *
 * Every on-screen presentation of a stats graphic — the on-air audience
 * display, a future timeline-editor preview pane, and the producer's live
 * monitor — renders through this module's `Stage` (plus the three
 * `containers/*` that build on it) so all three are, structurally,
 * literally the same component tree. Only the box each is mounted into
 * differs; nothing about the composition itself is allowed to.
 *
 * WHY A FIXED DESIGN-SPACE CANVAS:
 * The graphic is authored once, at broadcast resolution (1920x1080 — the
 * OBS/vMix canvas size), and must look IDENTICAL — same proportions, same
 * line breaks, same safe margins — whether it is composited full-size as a
 * browser source, or squeezed into a 340px producer-monitor box, or an
 * arbitrary editor preview pane. `vw`/`vh` CSS units cannot do this: they
 * resolve against the *viewport*, so the exact same JSX renders differently
 * depending on how big the browser window happens to be. `Stage` instead
 * lays everything out in fixed 1920x1080 design-space pixels and scales
 * that whole canvas UNIFORMLY (`transform: scale(...)`, one number for both
 * axes) into whatever box it is mounted in. `vw`/`vh` (see below) are the
 * in-canvas replacement: `vh(n)`/`vw(n)` are n% of the fixed 1080/1920
 * design canvas, not of the viewport, so they stay proportionally identical
 * at any scale.
 */
export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;
const STAGE_ASPECT = STAGE_WIDTH / STAGE_HEIGHT;

/** n% of the 1920px-wide design canvas, in design-space px. */
export function vw(n: number): number {
  return (n / 100) * STAGE_WIDTH;
}

/** n% of the 1080px-tall design canvas, in design-space px. */
export function vh(n: number): number {
  return (n / 100) * STAGE_HEIGHT;
}

export interface StageProps {
  children: ReactNode;
  /** Applied to the outer host (the element that is measured); the inner
   * 1920x1080 canvas is always unstyled beyond its transform. */
  style?: CSSProperties;
  className?: string;
}

/**
 * Scales a fixed 1920x1080 design canvas uniformly into whatever box its
 * host element resolves to — a full browser-source viewport, a small fixed
 * monitor box, or an editor preview pane. One `scale` value is applied to
 * both axes (`Math.min` of the width ratio and height ratio) so the canvas
 * always fits without distortion, letterboxing rather than stretching if
 * the host isn't exactly 16:9.
 *
 * Measures the host via `ResizeObserver` so it stays correct across
 * responsive layout changes and window resizes without any consumer having
 * to pass a size in. A host that never resolves a real box (for example, an
 * ancestor that is `position: absolute` with no explicit size — that
 * pattern exists in this app, see `AbsolouteLocator`) reports `0x0`
 * `ResizeObserver` entries; those are ignored rather than collapsing the
 * stage to nothing, and the stage falls back to (and tracks resizes of) the
 * window itself, matching how a full-bleed broadcast browser source is
 * actually sized.
 */
export const Stage: FC<StageProps> = ({ children, style, className }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : STAGE_WIDTH,
    height: typeof window !== 'undefined' ? window.innerHeight : STAGE_HEIGHT
  }));

  useEffect(() => {
    const host = hostRef.current;
    if (!host || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      // A zero-size read means the host isn't a real sized box (an
      // unconstrained absolutely-positioned ancestor, most likely) rather
      // than an intentional zero — keep whatever the last good
      // measurement was (initially the viewport) instead of scaling the
      // whole stage to nothing.
      if (rect && rect.width > 0 && rect.height > 0) {
        setBox({ width: rect.width, height: rect.height });
      }
    });
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Keeps the viewport fallback live for hosts that never resolve a real
    // box, so a full-bleed browser source still tracks window resizes.
    const onResize = () => {
      const rect = hostRef.current?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) return;
      setBox({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const scale =
    Math.min(box.width / STAGE_WIDTH, box.height / STAGE_HEIGHT) || 1;

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        // Set ONCE at the stats-graphics render tree's root and inherited
        // (a normal CSS property) by every DOM-based descendant - the
        // title/subtitle chrome (`containers/*.tsx`) and the table/tile
        // renderers never need to redeclare it. The ECharts-based renderers
        // (bar/grouped-bar/line/histogram/heatmap/geo-map) are the
        // exception: ECharts draws to `<canvas>`, which does not inherit
        // CSS, so each of those sets `fontFamily` explicitly in its own
        // `option` instead - see `theme.ts`'s `fontFamily` export.
        fontFamily,
        ...style
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        {children}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Layer primitives                                                    */
/* ------------------------------------------------------------------ */

/**
 * A full-bleed layer within the 1920x1080 stage canvas — `position:
 * absolute; inset: 0` relative to whatever sized design-space box it is
 * mounted in (a `Stage`'s inner canvas, or a container's own root).
 *
 * This is a plain positioning primitive, not a transition implementation:
 * it exists so `transition-engine.tsx` can stack an outgoing/exiting layer
 * and an incoming/entering layer on top of one another (both filling the
 * same design-space box) and animate them independently, without either
 * layer needing to know about the other. This module owns no enter/exit/
 * hold *state* — the transition worker decides when a layer is mounted,
 * how long it stays, and what CSS drives its motion; `StageLayer` only
 * guarantees the two layers occupy the same coordinate space so that
 * choreography reads as one graphic replacing another rather than a jump.
 */
export interface StageLayerProps {
  children: ReactNode;
  /** Documents the layer's role for the consumer/transition worker; has no
   * effect on layout here. */
  role?: 'enter' | 'hold' | 'exit';
  style?: CSSProperties;
  className?: string;
}

export const StageLayer: FC<StageLayerProps> = ({
  children,
  style,
  className
}) => (
  <div
    className={className}
    style={{ position: 'absolute', inset: 0, ...style }}
  >
    {children}
  </div>
);

/* ------------------------------------------------------------------ */
/* Unsupported kind/mode guard                                         */
/* ------------------------------------------------------------------ */

/** True when the broadcast rulebook (`SUPPORTED_GRAPHIC_MODES`) allows this
 * `kind` to be presented in this `mode`. */
export function isSupportedGraphicCombo(
  kind: GraphicKind,
  mode: PresentationMode
): boolean {
  const allowed = SUPPORTED_GRAPHIC_MODES[kind];
  return Array.isArray(allowed) && allowed.includes(mode);
}

export interface UnsupportedGraphicNoticeProps {
  kind: GraphicKind;
  mode: PresentationMode;
}

/**
 * Controlled, visible error card for an unsupported `kind`/`mode`
 * combination. A silently mangled layout reaching air is worse than an
 * explicit "this can't be shown" card — this is that card.
 *
 * Deliberately does NOT reuse `overlayCardStyle`/the brand gradient: an
 * error state must read as visually distinct from a normal graphic at a
 * glance, on air or on the monitor.
 */
export const UnsupportedGraphicNotice: FC<UnsupportedGraphicNoticeProps> = ({
  kind,
  mode
}) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      minHeight: 0,
      minWidth: 0,
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: vh(1),
      padding: vh(2),
      textAlign: 'center',
      color: palette.textPrimary,
      backgroundColor: 'rgba(120, 0, 0, 0.75)',
      border: '2px solid #ff4d4f',
      borderRadius: 12
    }}
  >
    <div style={{ ...textStrokeStyle, fontSize: vh(2.6), fontWeight: 700 }}>
      Unsupported graphic
    </div>
    <div style={{ ...textStrokeStyle, fontSize: vh(1.6), opacity: 0.85 }}>
      &quot;{kind}&quot; cannot be shown in &quot;{mode}&quot;
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export const stageAspectRatio = STAGE_ASPECT;
