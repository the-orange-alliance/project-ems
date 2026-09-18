import { useLayoutEffect, useRef, useState } from 'react';
import type { GraphicSpec, PresentationMode } from '@toa-lib/models';
import { palette } from '../theme.js';
import {
  computePageCount,
  resolvePageDwellMs,
  resolveRowsPerPage,
  useTimedPageIndex
} from './presentation-format.js';

export const TABLE_PAGE_FOOTER_HEIGHT = 24;
export const TABLE_HEADER_HEIGHT = 40;
export const TABLE_ROW_HEIGHT = 44;
export const RANKING_ROW_HEIGHT = 72;
export const RANKING_ROW_GAP = 6;
export const TABLE_PADDING = 16;

/** Fixed design-space row metrics; never depend on fonts, viewport scale, or row contents. */
export function fitRowsPerPage(
  mode: PresentationMode,
  height: number,
  ranking: boolean
): number {
  const limit = resolveRowsPerPage(mode);
  if (height <= 0) return limit;
  const header = ranking ? 0 : TABLE_HEADER_HEIGHT;
  const gap = ranking ? RANKING_ROW_GAP : 0;
  const rowHeight = ranking ? RANKING_ROW_HEIGHT : TABLE_ROW_HEIGHT;
  // Reserve the footer even on a one-page result, so capacity never oscillates.
  const available =
    height -
    TABLE_PADDING * 2 -
    TABLE_PAGE_FOOTER_HEIGHT -
    header -
    (ranking ? 0 : 2);
  return Math.min(
    limit,
    Math.max(1, Math.floor((available + gap) / (rowHeight + gap)))
  );
}

/**
 * Overflowing rows page only when `spec.autoPage` is explicitly true AND an
 * authoritative origin (`program.takenAtUtc`) is supplied. Otherwise the
 * table holds page 1 and nothing is scheduled: no on-air change without a
 * producer command.
 */
export function useBroadcastTablePage(
  spec: GraphicSpec,
  rowCount: number,
  ranking = false,
  pagingOriginMs: number | null = null,
  clock?: () => number
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // clientHeight is untransformed design-space size, unlike getBoundingClientRect.
    setHeight(root.clientHeight);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      setHeight(root.clientHeight);
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);
  const rowsPerPage = fitRowsPerPage(spec.mode, height, ranking);
  const pageCount = computePageCount(rowCount, rowsPerPage);
  const autoPage = spec.autoPage === true;
  const activePage = useTimedPageIndex(
    pageCount,
    resolvePageDwellMs(spec.holdMs),
    autoPage ? pagingOriginMs : null,
    clock
  );
  return { rootRef, rowsPerPage, pageCount, activePage, autoPage };
}

/** A bounded passive indicator also exposes page position to assistive technology. */
export function BroadcastPageIndicator({
  pageCount,
  activePage,
  autoPage,
  rowsPerPage,
  rowCount
}: {
  pageCount: number;
  activePage: number;
  autoPage: boolean;
  rowsPerPage: number;
  rowCount: number;
}) {
  // Without auto-paging an overflowing table never moves, so say rows are withheld rather than implying more pages will come.
  const label =
    pageCount <= 1
      ? null
      : autoPage
        ? `Page ${activePage + 1} of ${pageCount}`
        : `Showing ${rowsPerPage} of ${rowCount}`;
  return (
    <div
      role='status'
      aria-live='off'
      aria-label='Table page'
      style={{
        height: TABLE_PAGE_FOOTER_HEIGHT,
        flex: '0 0 auto',
        textAlign: 'center',
        fontSize: 14,
        lineHeight: `${TABLE_PAGE_FOOTER_HEIGHT}px`,
        color: palette.textSecondary
      }}
    >
      {label}
    </div>
  );
}
