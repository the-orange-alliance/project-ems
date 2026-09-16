import type {
  GraphicSpec,
  PlaybackStateEnvelope,
  VizFrame
} from '@toa-lib/models';
import { act, render, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { numberFormat } from '@toa-lib/models/seasons/stats/presentation';
import DataTable from './data-table.js';
import RankingTable from './ranking-table.js';
import { pageIndexAt, resolveRowsPerPage } from './presentation-format.js';
import {
  createTransitionCommit,
  deriveVisual,
  programTransitionAuthority
} from '../transition-machine.js';

const ORIGIN_UTC = '2026-09-16T18:00:00.000Z';
const ORIGIN_MS = Date.parse(ORIGIN_UTC);
const DWELL_MS = 4000;
const CAPACITY = resolveRowsPerPage('fullscreen');
const ROWS = CAPACITY * 3; // exactly three pages

function spec(
  kind: 'table' | 'ranking-table',
  autoPage?: boolean
): GraphicSpec {
  return {
    id: 'paging',
    title: 'Paging',
    stat: 'fixture',
    selectors: {},
    filters: {},
    params: {},
    kind,
    mode: 'fullscreen',
    options: {},
    holdMs: DWELL_MS,
    ...(autoPage === undefined ? {} : { autoPage })
  };
}
function frame(kind: 'table' | 'ranking-table'): VizFrame {
  return {
    kind,
    title: 'Paging',
    asOfUtc: ORIGIN_UTC,
    quality: 'complete',
    warnings: [],
    series: [],
    data: {
      kind,
      columns: [{ id: 'score', label: 'Score', format: numberFormat(0, '') }],
      rows: Array.from({ length: ROWS }, (_, i) => ({
        id: `row-${i}`,
        label: `Team ${i}`,
        rank: i + 1,
        cells: { score: i }
      }))
    }
  };
}
const firstRow = (root: HTMLElement) =>
  within(root).getAllByText(/^Team \d+$/)[0].textContent;
const pageLabel = (root: HTMLElement) =>
  within(root).getByRole('status', { name: 'Table page' }).textContent;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(ORIGIN_MS);
});
afterEach(() => vi.useRealTimers());

describe.each(['table', 'ranking-table'] as const)('%s paging', (kind) => {
  const Renderer = kind === 'table' ? DataTable : RankingTable;

  it('does not advance on its own when auto-paging is unset, and says rows are withheld', () => {
    // Even with an authoritative origin and a hold duration configured.
    const { container } = render(
      <Renderer
        frame={frame(kind)}
        spec={spec(kind)}
        pagingOriginMs={ORIGIN_MS}
      />
    );
    act(() => vi.advanceTimersByTime(DWELL_MS * 10));
    expect(firstRow(container)).toBe('Team 0');
    expect(pageLabel(container)).toBe(`Showing ${CAPACITY} of ${ROWS}`);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('is static when auto-paging is on but no authoritative origin exists', () => {
    const { container } = render(
      <Renderer frame={frame(kind)} spec={spec(kind, true)} />
    );
    act(() => vi.advanceTimersByTime(DWELL_MS * 10));
    expect(firstRow(container)).toBe('Team 0');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('shows the same page on displays mounted at different times', () => {
    vi.setSystemTime(ORIGIN_MS + 1000);
    const a = render(
      <Renderer
        frame={frame(kind)}
        spec={spec(kind, true)}
        pagingOriginMs={ORIGIN_MS}
      />
    );
    act(() => vi.advanceTimersByTime(DWELL_MS + 1700)); // now origin + 6.7 s
    const b = render(
      <Renderer
        frame={frame(kind)}
        spec={spec(kind, true)}
        pagingOriginMs={ORIGIN_MS}
      />
    );
    for (let step = 0; step < 8; step++) {
      const expected = pageIndexAt(Date.now(), ORIGIN_MS, DWELL_MS, 3);
      expect(pageLabel(a.container)).toBe(`Page ${expected + 1} of 3`);
      expect(pageLabel(b.container)).toBe(pageLabel(a.container));
      expect(firstRow(b.container)).toBe(firstRow(a.container));
      act(() => vi.advanceTimersByTime(1300));
    }
  });

  it('resumes mid-show on the page the show is on, not page 1', () => {
    const first = render(
      <Renderer
        frame={frame(kind)}
        spec={spec(kind, true)}
        pagingOriginMs={ORIGIN_MS}
      />
    );
    first.unmount();
    vi.setSystemTime(ORIGIN_MS + DWELL_MS * 2 + 500);
    const { container } = render(
      <Renderer
        frame={frame(kind)}
        spec={spec(kind, true)}
        pagingOriginMs={ORIGIN_MS}
      />
    );
    expect(pageLabel(container)).toBe('Page 3 of 3');
    expect(firstRow(container)).toBe(`Team ${CAPACITY * 2}`);
  });
});

describe('pageIndexAt (injectable clock)', () => {
  it('is a pure function of wall clock, origin, dwell and page count', () => {
    expect(pageIndexAt(ORIGIN_MS, ORIGIN_MS, DWELL_MS, 3)).toBe(0);
    expect(pageIndexAt(ORIGIN_MS + DWELL_MS - 1, ORIGIN_MS, DWELL_MS, 3)).toBe(
      0
    );
    expect(pageIndexAt(ORIGIN_MS + DWELL_MS, ORIGIN_MS, DWELL_MS, 3)).toBe(1);
    expect(pageIndexAt(ORIGIN_MS + DWELL_MS * 3, ORIGIN_MS, DWELL_MS, 3)).toBe(
      0
    );
    // A display whose clock is behind the origin holds page 1 rather than paging backwards.
    expect(pageIndexAt(ORIGIN_MS - 5000, ORIGIN_MS, DWELL_MS, 3)).toBe(0);
    expect(pageIndexAt(ORIGIN_MS + 99999, ORIGIN_MS, DWELL_MS, 1)).toBe(0);
  });
});

describe('paging origin reaches renderer layers from the playback envelope', () => {
  it('uses program.takenAtUtc as the shared origin', () => {
    const graphicSpec = spec('table', true);
    const graphicFrame = frame('table');
    const envelope = {
      schemaVersion: 1,
      authorityEpoch: 'epoch',
      eventKey: 'event',
      state: {
        revision: 4,
        program: { revision: 4, takenAtUtc: ORIGIN_UTC },
        transition: null
      }
    } as unknown as PlaybackStateEnvelope;
    const authority = programTransitionAuthority(envelope);
    expect(authority?.programTakenAtMs).toBe(ORIGIN_MS);
    const commit = createTransitionCommit(graphicSpec, graphicFrame, authority);
    const visual = deriveVisual(
      { kind: 'settled', commit: commit as never },
      ORIGIN_MS
    );
    expect(visual.layers[0].pagingOriginMs).toBe(ORIGIN_MS);
    // Preview / no authority: no origin, so nothing pages.
    const local = createTransitionCommit(graphicSpec, graphicFrame);
    expect(
      deriveVisual({ kind: 'settled', commit: local as never }, 0).layers[0]
        .pagingOriginMs
    ).toBeNull();
  });
});
