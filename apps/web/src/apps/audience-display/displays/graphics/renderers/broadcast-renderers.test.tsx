import type {
  GraphicKind,
  GraphicSpec,
  PresentationMode,
  VizFrame
} from '@toa-lib/models';
import { SUPPORTED_GRAPHIC_MODES } from '@toa-lib/models';
import { act, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DataTable from './data-table.js';
import RankingTable from './ranking-table.js';
import StatTile from './stat-tile.js';
import { FullscreenPayload } from '../containers/fullscreen.js';
import { DrawerPayload } from '../containers/drawer.js';
import { fitRowsPerPage } from './broadcast-table-layout.js';
import {
  formatChartValue,
  formatLegacyCell,
  formatLegacyNumber,
  formatTypedCell,
  resolveChartAxisFormat,
  resolveLegacyPrecision,
  resolvePageDwellMs,
  resolveRowsPerPage
} from './presentation-format.js';
import {
  formatSemanticCell,
  numberFormat,
  percentFormat
} from '@toa-lib/models/seasons/stats/presentation';

function spec(
  kind: GraphicKind,
  mode: PresentationMode = 'fullscreen'
): GraphicSpec {
  return {
    id: 'fixture',
    title: 'Broadcast title',
    subtitle: 'Broadcast subtitle',
    stat: 'fixture',
    selectors: {},
    filters: {},
    params: {},
    kind,
    mode,
    options: {},
    holdMs: 3000,
    autoPage: true
  };
}
function frame(kind: GraphicKind, count: number): VizFrame {
  return {
    kind,
    title: 'Broadcast title',
    subtitle: 'Broadcast subtitle',
    asOfUtc: '2026-09-15T00:00:00Z',
    quality: 'complete',
    warnings: [],
    series: [],
    data: {
      kind: kind as 'table' | 'ranking-table',
      columns: [
        { id: 'score', label: 'Score', format: numberFormat(1, 'points') }
      ],
      rows: Array.from({ length: count }, (_, i) => ({
        id: `row-${i}`,
        label: `Team ${i}`,
        rank: i + 7,
        cells: { score: i }
      }))
    }
  };
}

describe.each(['table', 'ranking-table'] as const)(
  '%s broadcast pages',
  (kind) => {
    for (const mode of SUPPORTED_GRAPHIC_MODES[kind]) {
      const capacity = resolveRowsPerPage(mode);
      it.each([0, 1, capacity, capacity + 1, 2 * capacity + 1])(
        `renders every row once per cycle in ${mode}, count %i`,
        (count) => {
          vi.useFakeTimers();
          const origin = Date.now();
          const source = frame(kind, count);
          const before = JSON.stringify(source);
          const graphic = spec(kind, mode);
          const Renderer = kind === 'table' ? DataTable : RankingTable;
          const Payload =
            mode === 'fullscreen' ? FullscreenPayload : DrawerPayload;
          const { container, rerender } = render(
            <Payload title={graphic.title} subtitle={graphic.subtitle}>
              <Renderer frame={source} spec={graphic} pagingOriginMs={origin} />
            </Payload>
          );
          expect(screen.getAllByText(graphic.title)).toHaveLength(1);
          expect(screen.getAllByText(graphic.subtitle!)).toHaveLength(1);
          const seen: string[] = [];
          const pages = Math.max(1, Math.ceil(count / capacity));
          for (let page = 0; page < pages; page++) {
            const labels = screen
              .queryAllByText(/^Team \d+$/)
              .map((node) => node.textContent!);
            seen.push(...labels);
            if (count > capacity)
              expect(
                screen.getByText(`Page ${page + 1} of ${pages}`)
              ).toBeInTheDocument();
            // Fresh frames/specs with the same size preserve page position and cadence.
            act(() => vi.advanceTimersByTime(1500));
            rerender(
              <Payload title={graphic.title} subtitle={graphic.subtitle}>
                <Renderer
                  frame={{ ...source }}
                  spec={{ ...graphic }}
                  pagingOriginMs={origin}
                />
              </Payload>
            );
            expect(
              screen
                .queryAllByText(/^Team \d+$/)
                .map((node) => node.textContent)
            ).toEqual(labels);
            act(() => vi.advanceTimersByTime(1500));
          }
          expect(seen).toEqual(
            Array.from({ length: count }, (_, i) => `Team ${i}`)
          );
          if (count) expect(screen.getByText('Team 0')).toBeInTheDocument();
          if (kind === 'ranking-table' && count)
            expect(
              within(screen.getAllByRole('listitem')[0]).getByText('7')
            ).toBeInTheDocument();
          for (const node of container.querySelectorAll<HTMLElement>(
            '[style]'
          )) {
            expect(node.style.overflow).not.toBe('auto');
            expect(node.style.overflow).not.toBe('scroll');
          }
          expect(JSON.stringify(source)).toBe(before);
        }
      );
    }
  }
);

it.each(['table', 'ranking-table'] as const)(
  '%s reduces capacity on resize and cycles through final rows',
  (kind) => {
    vi.useFakeTimers();
    let height = 500;
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
      () => height
    );
    let resize: ResizeObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback;
        }
        observe() {}
        disconnect = disconnect;
      }
    );
    const graphic = spec(kind);
    const Renderer = kind === 'table' ? DataTable : RankingTable;
    const { unmount } = render(
      <Renderer
        spec={graphic}
        frame={frame(kind, 13)}
        pagingOriginMs={Date.now()}
      />
    );
    const firstCapacity = fitRowsPerPage(
      graphic.mode,
      height,
      kind === 'ranking-table'
    );
    expect(screen.getAllByText(/^Team \d+$/)).toHaveLength(firstCapacity);
    height = 240;
    act(() => resize!([], {} as ResizeObserver));
    const nextCapacity = fitRowsPerPage(
      graphic.mode,
      height,
      kind === 'ranking-table'
    );
    expect(screen.getAllByText(/^Team \d+$/)).toHaveLength(nextCapacity);
    const pageCount = Math.ceil(13 / nextCapacity);
    act(() => vi.advanceTimersByTime((pageCount - 1) * 3000));
    expect(screen.getByText('Team 12')).toBeInTheDocument();
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  }
);

it('preserves typed cells and units across generic tables, rankings, tiles, and chart labels', () => {
  const values = [
    0,
    null,
    true,
    false,
    '0012',
    -1234567.875,
    0.425,
    42.5
  ] as const;
  const formats = [
    numberFormat(0),
    numberFormat(),
    numberFormat(),
    numberFormat(),
    numberFormat(),
    numberFormat(2, 'points'),
    percentFormat('ratio'),
    percentFormat('percent')
  ];
  const expected = [
    '0',
    '—',
    'Yes',
    'No',
    '0012',
    '-1234567.88 points',
    '42.5%',
    '42.5%'
  ];
  for (const kind of ['table', 'ranking-table', 'stat-tile'] as const) {
    const source = frame('table', 0);
    source.kind = kind;
    source.data =
      kind === 'stat-tile'
        ? {
            kind,
            values: values.map((value, i) => ({
              id: `v-${i}`,
              label: `Value ${i}`,
              value,
              format: formats[i]
            }))
          }
        : {
            kind,
            columns: formats.map((format, i) => ({
              id: `v-${i}`,
              label: `Value ${i}`,
              format
            })),
            rows: [
              {
                id: 'typed',
                label: 'Typed team',
                rank: 7,
                cells: Object.fromEntries(
                  values.map((value, i) => [`v-${i}`, value])
                )
              }
            ]
          };
    const Renderer =
      kind === 'table'
        ? DataTable
        : kind === 'ranking-table'
          ? RankingTable
          : StatTile;
    const { unmount } = render(<Renderer frame={source} spec={spec(kind)} />);
    for (const text of expected)
      expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    unmount();
  }
  values.forEach((value, i) => {
    expect(formatTypedCell(value, formats[i])).toBe(expected[i]);
    if (typeof value === 'number' || value === null)
      expect(formatChartValue(value, formats[i])).toBe(expected[i]);
  });
});

it('never consults the host locale and follows model rounding, including negative/large values', () => {
  const hostFormatter = vi
    .spyOn(Number.prototype, 'toLocaleString')
    .mockImplementation(() => {
      throw new Error('host locale used');
    });
  for (const value of [0, -0, -0.0001, 1.005, -1234567.875, 1e21]) {
    expect(formatLegacyNumber(value, 2)).toBe(
      formatSemanticCell(value, numberFormat(2))
    );
  }
  expect(formatLegacyNumber(1234567.5, 2)).toBe('1234567.50');
  expect(hostFormatter).not.toHaveBeenCalled();
  expect(formatLegacyCell(false, 2)).toBe('No');
  expect(formatLegacyCell('0012', 2)).toBe('0012');
  expect(formatLegacyCell(null, 2)).toBe('—');
  expect(
    resolveLegacyPrecision({ ...spec('table'), options: { precision: -3 } })
  ).toBe(0);
  expect(
    resolveLegacyPrecision({ ...spec('table'), options: { precision: 100 } })
  ).toBe(12);
  expect(resolvePageDwellMs(1)).toBe(3000);
  expect(resolvePageDwellMs(999999)).toBe(20000);
});

it('preserves semantic column IDs that resemble bridge metadata and clusters before paging', () => {
  const source = frame('table', 0);
  source.data = {
    kind: 'table',
    columns: [
      { id: '__entity', label: 'Text', format: numberFormat() },
      { id: '__group', label: 'Flag', format: numberFormat() }
    ],
    rows: [
      {
        id: 'blue',
        label: 'Blue team',
        group: 'blue',
        cells: { __entity: '0012', __group: false }
      },
      {
        id: 'red',
        label: 'Red team',
        group: 'red',
        cells: { __entity: 'Robot', __group: true }
      }
    ]
  };
  render(<DataTable frame={source} spec={spec('table')} />);
  expect(screen.getAllByRole('row')[1]).toHaveTextContent('Red teamRobotYes');
  expect(screen.getAllByRole('row')[2]).toHaveTextContent('Blue team0012No');
});

it('cycles legacy series and columnar tables without losing null/zero/boolean/text', () => {
  vi.useFakeTimers();
  const origin = Date.now();
  const source = {
    ...frame('table', 0),
    data: undefined,
    columns: [
      { key: 'name', label: 'Name' },
      { key: 'value', label: 'Value' }
    ],
    rows: [
      { name: 'Zero', value: 0 },
      { name: 'Null', value: null },
      { name: 'False', value: false },
      { name: 'Text', value: '0012' }
    ]
  };
  const { rerender } = render(
    <DataTable frame={source} spec={spec('table')} pagingOriginMs={origin} />
  );
  for (const text of ['0.0', '—', 'No', '0012'])
    expect(screen.getByText(text)).toBeInTheDocument();
  rerender(
    <DataTable
      frame={{
        ...source,
        columns: undefined,
        rows: undefined,
        series: [
          {
            points: Array.from({ length: 11 }, (_, i) => ({
              label: `Series row ${i}`,
              value: i === 10 ? null : i
            }))
          }
        ]
      }}
      spec={spec('table')}
      pagingOriginMs={origin}
    />
  );
  act(() => vi.advanceTimersByTime(3000));
  expect(screen.getByText('Series row 10')).toBeInTheDocument();
  expect(screen.getByText('—')).toBeInTheDocument();
});

it('uses raw storage ticks for a mixed-unit axis', () => {
  const source = frame('grouped-bar', 0);
  source.data = {
    kind: 'grouped-bar',
    entities: [],
    series: [
      {
        id: 'ratio',
        label: 'Ratio',
        measure: {
          id: 'ratio',
          label: 'Ratio',
          format: percentFormat('ratio')
        },
        points: []
      },
      {
        id: 'count',
        label: 'Count',
        measure: {
          id: 'count',
          label: 'Count',
          format: numberFormat(0, 'points')
        },
        points: []
      }
    ]
  };
  expect(
    formatChartValue(0.425, resolveChartAxisFormat(source, spec('grouped-bar')))
  ).toBe('0.4');
});
