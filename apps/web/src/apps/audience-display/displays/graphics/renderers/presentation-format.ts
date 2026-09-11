import { useEffect, useRef, useState } from 'react';
import type {
  GraphicSpec,
  MeasureFormat,
  PresentationMode
} from '@toa-lib/models';
import {
  formatSemanticCell,
  type SemanticCell
} from '@toa-lib/models/seasons/stats/presentation';

/**
 * Pure, framework-free formatting/paging helpers shared by the scalar
 * (`stat-tile`), `ranking-table`, and generic `table` renderers.
 *
 * `apps/web` has no test runner configured (no vitest/jest dependency, no
 * config, no `test` script) — verified before writing this module. Every
 * function below is deliberately pure and side-effect-free (the one
 * exception, `useAutoPageIndex`, is a thin React wrapper around the pure
 * `wrapPageIndex`) so a future runner can exercise them directly without a
 * DOM or React tree: legacy-number formatting, typed-cell formatting
 * (precision/unit/percent-scale honored, `null` vs `0` kept distinct, text
 * cells never coerced through number formatting), non-interactive paging
 * math, and authoritative-rank resolution (rank 7/8 must stay 7/8 — never
 * renumbered by array position).
 */

/* ------------------------------------------------------------------ */
/* Legacy (v1 `frame.series` / `frame.columns` + `frame.rows`) numbers */
/* ------------------------------------------------------------------ */

/** Legacy-only: v1 frames carry no per-measure format, just a spec-level hint. */
export function resolveLegacyPrecision(spec: GraphicSpec): number {
  const precision = spec.options?.precision;
  return typeof precision === 'number' && Number.isFinite(precision)
    ? precision
    : 1;
}

export function formatLegacyNumber(value: number, precision: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });
}

/* ------------------------------------------------------------------ */
/* Typed (v2 `frame.data`) semantic cells                              */
/* ------------------------------------------------------------------ */

/**
 * Formats one typed semantic cell honoring its measure's precision, unit,
 * and percentage scaling. `null` is "no observation was made" and is
 * handled by the caller (rendered as a colored em-dash) — this function is
 * only ever called for a non-null cell so a measured `0` never collapses
 * into the same code path as a missing value.
 *
 * Booleans get a broadcast-friendly Yes/No instead of the generic
 * `formatSemanticCell` stringification; every other type (number, text)
 * defers to `formatSemanticCell` so precision/unit/percent-scale stay a
 * single source of truth with the season semantic layer.
 */
export function formatTypedCell(
  value: Exclude<SemanticCell, null>,
  format: MeasureFormat
): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return formatSemanticCell(value, format);
}

/* ------------------------------------------------------------------ */
/* Alliance grouping (`teamsInMatchId`, Phase 2 - modular, opt-in)     */
/* ------------------------------------------------------------------ */

/**
 * `bar`/`grouped-bar`'s legacy per-point bridge: `group` (Phase 2's
 * `teamsInMatchId` alliance coloring/grouping - see `applyAllianceGroups` in
 * `@toa-lib/models`'s `semantic-helpers.ts`) rides along in `point.meta.group`
 * rather than a typed field, since `VizFrame.series[].points[].meta` is the
 * only per-point extensibility slot the legacy bridge shape has. Returns
 * `undefined` whenever `applyAllianceGroups` never ran for this graphic (a
 * plain `teamKey` selection or an event-wide "all teams" leaderboard) - a
 * renderer must treat that as "no alliance grouping applies here", never
 * default it to either color.
 */
export function legacyPointAllianceGroup(
  meta: unknown
): 'red' | 'blue' | undefined {
  if (!meta || typeof meta !== 'object') return undefined;
  const { group } = meta as Record<string, unknown>;
  return group === 'red' || group === 'blue' ? group : undefined;
}

/** `table`/`ranking-table`'s legacy row bridge: `group` rides along as the top-level `__group` key (see `legacyBridge`) - same absence contract as `legacyPointAllianceGroup`. */
export function legacyRowAllianceGroup(
  row: Record<string, unknown>
): 'red' | 'blue' | undefined {
  const group = row.__group;
  return group === 'red' || group === 'blue' ? group : undefined;
}

/* ------------------------------------------------------------------ */
/* Authoritative rank / identity                                       */
/* ------------------------------------------------------------------ */

/**
 * Resolves the on-screen rank for one row. A v2 `ranking-table` row's
 * `rank` is authoritative and source-derived (it can be 7 and 8 for a
 * filtered result that starts mid-leaderboard) and must always win over the
 * row's position in whatever (possibly filtered/paginated) array is being
 * rendered. `positionIndex` is used only as a defensive fallback for a
 * malformed/legacy row that genuinely carries no rank.
 */
export function resolveRowRank(
  row: { rank?: number },
  positionIndex: number
): number {
  return typeof row.rank === 'number' ? row.rank : positionIndex + 1;
}

/* ------------------------------------------------------------------ */
/* Non-interactive paging                                              */
/* ------------------------------------------------------------------ */

/**
 * An audience member cannot scroll a broadcast graphic, so a table that
 * exceeds its visible capacity pages through its rows automatically
 * instead of overflowing or relying on CSS scroll. Row-per-page defaults
 * are keyed by presentation mode (a `lower-third` band has far less
 * vertical room than `fullscreen`) rather than guessed per renderer.
 */
export const DEFAULT_ROWS_PER_PAGE_BY_MODE: Readonly<
  Record<PresentationMode, number>
> = {
  fullscreen: 10,
  'drawer-left': 8,
  'drawer-right': 8,
  'lower-third': 3
};

export function resolveRowsPerPage(
  mode: PresentationMode,
  overridesByMode: Partial<Record<PresentationMode, number>> = {}
): number {
  const override = overridesByMode[mode];
  if (
    typeof override === 'number' &&
    Number.isFinite(override) &&
    override > 0
  ) {
    return Math.max(1, Math.floor(override));
  }
  return DEFAULT_ROWS_PER_PAGE_BY_MODE[mode] ?? 8;
}

export function computePageCount(itemCount: number, pageSize: number): number {
  if (itemCount <= 0) return 0;
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

/** Always returns a value in `[0, pageCount)` — wraps rather than clamps, so
 * a page index simply keeps cycling instead of getting stuck at the end. */
export function wrapPageIndex(pageIndex: number, pageCount: number): number {
  if (pageCount <= 0) return 0;
  return ((pageIndex % pageCount) + pageCount) % pageCount;
}

export function paginate<T>(
  items: readonly T[],
  pageSize: number,
  pageIndex: number
): T[] {
  if (pageSize <= 0 || items.length <= pageSize) return items.slice();
  const pageCount = computePageCount(items.length, pageSize);
  const page = wrapPageIndex(pageIndex, pageCount);
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

/* ------------------------------------------------------------------ */
/* Page dwell time — sourced from the shared composition/playback      */
/* contract (`GraphicSpec.holdMs`), never an independent random timer  */
/* ------------------------------------------------------------------ */

/** Floor/ceiling so a producer-configured `holdMs` of e.g. 0 or 12 hours
 * can't leave a table frozen on one page or flickering unreadably fast. */
export const MIN_PAGE_DWELL_MS = 3000;
export const MAX_PAGE_DWELL_MS = 20000;
export const DEFAULT_PAGE_DWELL_MS = 8000;

/**
 * Every paging renderer derives its page-rotation cadence from
 * `spec.holdMs` — the one timing field the playback/composition contract
 * (`GraphicSpec`, see `libs/models/src/base/Graphics.ts`) already threads
 * through the producer UI and the transition engine — instead of each
 * renderer rolling its own `Math.random()`-seeded interval. This keeps
 * in-table paging deterministic and reproducible.
 */
export function resolvePageDwellMs(holdMs: number | undefined): number {
  if (typeof holdMs !== 'number' || !Number.isFinite(holdMs) || holdMs <= 0) {
    return DEFAULT_PAGE_DWELL_MS;
  }
  return Math.min(MAX_PAGE_DWELL_MS, Math.max(MIN_PAGE_DWELL_MS, holdMs));
}

/**
 * Thin React wrapper around `wrapPageIndex`: advances one page every
 * `dwellMs` on a plain `setInterval`, non-interactively (nothing here
 * responds to input — an audience member cannot scroll a broadcast
 * graphic). All paging state funnels through this one hook so every
 * consumer shares identical, deterministic timing/state semantics.
 */
export function useAutoPageIndex(pageCount: number, dwellMs: number): number {
  const [pageIndex, setPageIndex] = useState(0);
  const pageCountRef = useRef(pageCount);
  pageCountRef.current = pageCount;

  useEffect(() => {
    setPageIndex((current) => wrapPageIndex(current, Math.max(1, pageCount)));
  }, [pageCount]);

  useEffect(() => {
    if (pageCount <= 1) return undefined;
    const id = window.setInterval(() => {
      setPageIndex((current) =>
        wrapPageIndex(current + 1, pageCountRef.current)
      );
    }, dwellMs);
    return () => window.clearInterval(id);
  }, [pageCount, dwellMs]);

  return wrapPageIndex(pageIndex, Math.max(1, pageCount));
}
