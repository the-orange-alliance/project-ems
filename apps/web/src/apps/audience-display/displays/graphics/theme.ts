/**
 * Shared visual theme for the broadcast stats-graphics system.
 *
 * This module is intentionally framework-agnostic (plain constants + pure
 * functions, no JSX/React components) so it can be imported by both the
 * on-air display and the producer's preview without pulling in any
 * rendering-specific code.
 *
 * The on-air display renders as a TRANSPARENT browser source composited
 * over live video, so every value here is chosen to stay legible against
 * an unknown, moving background (dark scrims under gradients, stroked/
 * shadowed text, etc).
 */

import type { CSSProperties } from 'react';

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

export interface Palette {
  gradientStart: string;
  gradientEnd: string;
  /** `linear-gradient(90deg, ...)` at ~90% alpha, for use as a CSS background. */
  gradientCss: string;
  /** Dark translucent backdrop meant to sit UNDER the gradient for legibility. */
  scrim: string;
  /** Higher-contrast panel fill for producer-side surfaces and monitor framing. */
  panelBackground: string;
  /** Soft border used for on-air overlays and producer panels. */
  panelBorder: string;
  /** Strong focus indicator for keyboard users. */
  focusRing: string;
  /** Canonical alliance colors — conventional red/blue, not brand-derived. */
  allianceRed: string;
  allianceBlue: string;
  /** Desaturated gray for explicitly-missing values, distinct from real data. */
  nullNeutral: string;
  textPrimary: string;
  textSecondary: string;
}

// ~90% alpha (229/255) expressed as a hex alpha suffix.
const BRAND_ALPHA_HEX = 'e6';

export const palette: Palette = {
  gradientStart: '#ff7569',
  gradientEnd: '#de35a3',
  gradientCss: `linear-gradient(90deg, #ff7569${BRAND_ALPHA_HEX}, #de35a3${BRAND_ALPHA_HEX})`,
  scrim: 'rgba(5, 10, 18, 0.72)',
  panelBackground: 'rgba(17, 24, 39, 0.82)',
  panelBorder: 'rgba(255, 255, 255, 0.18)',
  focusRing: '#7dd3fc',
  // Sourced from apps/web/src/apps/audience-display/displays/seasons/fgc_default_v2/components/l3-header.tsx
  // (red alliance header uses #f87171, blue alliance header uses #60a5fa).
  allianceRed: '#f87171',
  allianceBlue: '#60a5fa',
  nullNeutral: '#6b7280',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.82)'
};

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

/**
 * The stats-graphics system's on-air/preview typeface: MEKTON, a font
 * installed locally on every machine that renders these graphics (the
 * on-air display and the producer's preview both run on venue-controlled
 * hardware, never an arbitrary visitor's browser, so there is no webfont
 * file to ship/`@font-face` here - the browser just resolves the family
 * name against the OS's installed fonts). `Roboto, sans-serif` stays as the
 * fallback chain for a machine where MEKTON somehow isn't installed, so a
 * missing font degrades to a readable default rather than the browser's
 * generic serif.
 */
export const fontFamily = "'MEKTON', Roboto, sans-serif";

/* ------------------------------------------------------------------ */
/* Ramp interpolation                                                  */
/* ------------------------------------------------------------------ */

function clampByte(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return [r, g, b];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clampByte(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Interpolates the brand gradient (gradientStart -> gradientEnd) in sRGB
 * space and returns a hex color for `index` of `total` evenly-spaced steps.
 *
 * Used to color ranked bar charts so the ranking reads as a smooth ramp.
 * Guards against division-by-zero and out-of-range indices.
 */
/**
 * `palette.allianceRed`/`allianceBlue` for a `teamsInMatchId` graphic's
 * alliance-grouped entity/row (see `group` on `PresentationData`'s `bar`/
 * `grouped-bar` entities and `table`/`ranking-table` rows, populated ONLY by
 * `applyAllianceGroups` in `@toa-lib/models`). A renderer should call this
 * ONLY when a `group` is actually present - it has no "neither" case,
 * because there IS no third alliance; absence of `group` means "don't call
 * this at all, use the normal ramp/measure color instead."
 */
export function allianceColor(group: 'red' | 'blue'): string {
  return group === 'red' ? palette.allianceRed : palette.allianceBlue;
}

export function rampColor(index: number, total: number): string {
  if (!Number.isFinite(total) || total <= 1) {
    return palette.gradientStart;
  }

  const stepCount = Math.max(1, Math.floor(total));
  const safeIndex = Math.floor(index) || 0;
  const clampedIndex = Math.min(Math.max(0, safeIndex), stepCount - 1);
  const t = stepCount <= 1 ? 0 : clampedIndex / (stepCount - 1);

  const [r1, g1, b1] = hexToRgb(palette.gradientStart);
  const [r2, g2, b2] = hexToRgb(palette.gradientEnd);

  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

/* ------------------------------------------------------------------ */
/* ECharts helpers                                                     */
/* ------------------------------------------------------------------ */

export interface EChartsLinearGradient {
  type: 'linear';
  x: number;
  y: number;
  x2: number;
  y2: number;
  colorStops: { offset: number; color: string }[];
}

/**
 * Returns an ECharts linear-gradient color object using the brand gradient.
 * Horizontal (left-to-right) by default; pass `vertical` for top-to-bottom.
 */
export function echartsGradient(vertical?: boolean): EChartsLinearGradient {
  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: vertical ? 0 : 1,
    y2: vertical ? 1 : 0,
    colorStops: [
      { offset: 0, color: palette.gradientStart },
      { offset: 1, color: palette.gradientEnd }
    ]
  };
}

const RAMP_SWATCH_COUNT = 6;

export interface EChartsThemeConfig {
  backgroundColor: string;
  color: string[];
  textStyle: {
    color: string;
    fontFamily: string;
  };
  title: { textStyle: { color: string } };
  legend: { textStyle: { color: string } };
  categoryAxis: {
    axisLine: { lineStyle: { color: string } };
    axisTick: { lineStyle: { color: string } };
    axisLabel: { color: string };
    splitLine: { lineStyle: { color: string } };
  };
  valueAxis: {
    axisLine: { lineStyle: { color: string } };
    axisTick: { lineStyle: { color: string } };
    axisLabel: { color: string };
    splitLine: { lineStyle: { color: string } };
  };
  animationDuration: number;
  animationDurationUpdate: number;
  animationDelay: number;
  animationDelayUpdate: number;
}

/**
 * Plain ECharts theme object (register via `echarts.registerTheme`).
 * Transparent background so charts composite cleanly over the live
 * broadcast/preview background; categorical colors sample the brand ramp.
 */
export const echartsTheme: EChartsThemeConfig = {
  backgroundColor: 'transparent',
  color: Array.from({ length: RAMP_SWATCH_COUNT }, (_, i) =>
    rampColor(i, RAMP_SWATCH_COUNT)
  ),
  textStyle: {
    color: palette.textPrimary,
    fontFamily
  },
  title: { textStyle: { color: palette.textPrimary } },
  legend: { textStyle: { color: palette.textSecondary } },
  categoryAxis: {
    axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.35)' } },
    axisTick: { lineStyle: { color: 'rgba(255, 255, 255, 0.35)' } },
    axisLabel: { color: palette.textSecondary },
    splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.12)' } }
  },
  valueAxis: {
    axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.35)' } },
    axisTick: { lineStyle: { color: 'rgba(255, 255, 255, 0.35)' } },
    axisLabel: { color: palette.textSecondary },
    splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.12)' } }
  },
  // Keep motion snappy and well under 400ms so on-air updates feel live.
  animationDuration: 350,
  animationDurationUpdate: 300,
  animationDelay: 0,
  animationDelayUpdate: 0
};

/**
 * How long one graphic's content dissolves into the next one's, for a
 * same-`mode` change where the presentation container itself never moves
 * (see `content-crossfade.tsx` and the transition engine's choreography
 * rules). Deliberately equal to `echartsTheme.animationDurationUpdate` above
 * so a chart's own internal update animation and this cross-layer dissolve
 * land on the same beat, and so the transition engine's `'entering'` phase
 * for a same-mode change covers exactly the dissolve it exists to bound.
 */
export const CONTENT_CROSSFADE_MS = 300;

/* ------------------------------------------------------------------ */
/* Live background (slow drifting gradient)                           */
/* ------------------------------------------------------------------ */

const LIVE_BACKGROUND_ANIMATION_NAME = 'ems-stats-live-bg-drift';

/**
 * A subtle, slowly-drifting brand gradient for full-bleed backgrounds.
 * Pair with `liveBackgroundKeyframes` (inject the keyframes text into a
 * `<style>` tag once) for the animation to take effect.
 */
export const liveBackgroundCss: CSSProperties = {
  backgroundImage: palette.gradientCss,
  backgroundSize: '200% 100%',
  backgroundPosition: '0% 50%',
  animationName: LIVE_BACKGROUND_ANIMATION_NAME,
  animationDuration: '20s',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
  animationDirection: 'alternate'
};

/**
 * Raw `@keyframes` CSS for `liveBackgroundCss`. Inject verbatim into a
 * `<style>` tag. Wrapped with a `prefers-reduced-motion: reduce` override
 * override scoped to this animation only, so the drift stops for viewers
 * who requested reduced motion without disabling the graphic enter/exit
 * transitions the transition engine drives.
 */
export const liveBackgroundKeyframes = `
@keyframes ${LIVE_BACKGROUND_ANIMATION_NAME} {
  0% { background-position: 0% 50%; }
  100% { background-position: 100% 50%; }
}

@media (prefers-reduced-motion: reduce) {
  [style*='${LIVE_BACKGROUND_ANIMATION_NAME}'] {
    animation-name: none !important;
    background-position: 0% 50% !important;
  }
}
`;

/* ------------------------------------------------------------------ */
/* Shared surface / text treatments                                    */
/* ------------------------------------------------------------------ */

/**
 * The app's existing glassmorphic overlay card treatment.
 * See apps/web/src/apps/audience-display/displays/seasons/fgc_default_v2/match-results-stream.tsx (~lines 31-48).
 */
export const overlayCardStyle: CSSProperties = {
  backdropFilter: 'blur(5px)',
  backgroundColor: palette.panelBackground,
  borderRadius: '1.5rem',
  boxShadow: '0 10px 32px 0 rgba(0, 0, 0, 0.38)',
  border: `1px solid ${palette.panelBorder}`
};

/**
 * The app's existing on-air text treatment (a thin dark stroke that keeps
 * text legible over arbitrary live video).
 * See apps/web/src/apps/audience-display/displays/seasons/fgc_default_v2/components/l3-header.tsx.
 */
export const textStrokeStyle: CSSProperties = {
  WebkitTextStroke: '1px #00000080'
};
