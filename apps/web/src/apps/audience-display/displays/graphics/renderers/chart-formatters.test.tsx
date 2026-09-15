import type { GraphicKind, GraphicSpec, VizFrame } from '@toa-lib/models';
import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import {
  numberFormat,
  percentFormat
} from '@toa-lib/models/seasons/stats/presentation';
import BarChart from './bar-chart.js';
import GroupedBarChart from './grouped-bar-chart.js';
import HistogramChart from './histogram-chart.js';
import LineChart from './line-chart.js';
import HeatmapChart from './heatmap-chart.js';
import GeoMap from './geo-map.js';

interface ChartOption {
  series: {
    data: unknown[];
    label: {
      formatter?: (params: {
        value: number | null | [number, number, number];
      }) => string;
    };
  }[];
  xAxis: {
    type: string;
    axisLabel?: { formatter?: (value: number) => string };
  };
  yAxis: {
    type: string;
    axisLabel?: { formatter?: (value: number) => string };
  };
  grid: { top: string | number };
  legend?: { top?: string | number };
}
const captured = vi.hoisted(() => ({
  option: undefined as ChartOption | undefined
}));
vi.mock('echarts-for-react', () => ({
  default: ({ option }: { option: ChartOption }) => {
    captured.option = option;
    return <div>Chart</div>;
  }
}));
vi.mock('echarts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('echarts')>()),
  getMap: () => undefined
}));

const graphic = (kind: GraphicKind): GraphicSpec => ({
  id: 'chart',
  stat: 'chart',
  title: 'Title',
  selectors: {},
  filters: {},
  params: {},
  kind,
  mode: 'fullscreen',
  options: { precision: 2 }
});
function source(kind: GraphicKind): VizFrame {
  return {
    kind,
    title: 'Title',
    subtitle: 'Subtitle belongs to container',
    asOfUtc: '2026-09-15T00:00:00Z',
    quality: 'complete',
    warnings: [],
    series: [
      {
        name: 'Value',
        points: [
          { label: 'Robot', value: 0.425 },
          { label: 'Missing', value: null }
        ]
      }
    ]
  };
}

it('formats numeric coordinates without losing fractional tick precision', () => {
  const frame = source('line');
  frame.axis = { xType: 'value' };
  frame.series = [{ points: [{ label: '1.25', value: 0 }] }];
  render(<LineChart frame={frame} spec={graphic('line')} />);
  expect(captured.option!.xAxis.axisLabel!.formatter!(1.25)).toBe('1.25');
  expect(captured.option!.series[0].data).toEqual([[1.25, 0]]);
});

it.each([
  ['bar', BarChart],
  ['grouped-bar', GroupedBarChart],
  ['histogram', HistogramChart],
  ['line', LineChart],
  ['heatmap', HeatmapChart],
  ['geo-map', GeoMap]
] as const)(
  '%s uses semantic percent text and keeps raw storage values and missing observations',
  (kind, Renderer) => {
    const frame = source(kind);
    const measure = {
      id: 'value',
      label: 'Value',
      format: percentFormat('ratio')
    };
    const points = [
      { entityId: 'robot', value: 0.425 },
      { entityId: 'missing', value: null }
    ];
    if (kind === 'bar' || kind === 'grouped-bar')
      frame.data = {
        kind,
        entities: [
          { id: 'robot', label: 'Robot' },
          { id: 'missing', label: 'Missing' }
        ],
        series: [{ id: 'value', label: 'Value', measure, points }]
      };
    if (kind === 'histogram')
      frame.data = {
        kind,
        measure,
        bins: [
          { id: 'robot', label: 'Robot', lower: 0, upper: 1, value: 0.425 },
          { id: 'missing', label: 'Missing', lower: 1, upper: 2, value: null }
        ]
      };
    if (kind === 'line')
      frame.data = {
        kind,
        xType: 'number',
        series: [
          {
            id: 'value',
            label: 'Value',
            measure,
            interpolation: 'linear',
            points: [
              { x: 1, value: 0.425 },
              { x: 2, value: null }
            ]
          }
        ]
      };
    if (kind === 'heatmap')
      frame.data = {
        kind,
        measure,
        xEntities: [{ id: 'x', label: 'X' }],
        yEntities: [
          { id: 'y', label: 'Y' },
          { id: 'missing', label: 'Missing' }
        ],
        cells: [
          { xId: 'x', yId: 'y', value: 0.425 },
          { xId: 'x', yId: 'missing', value: null }
        ]
      };
    if (kind === 'geo-map')
      frame.data = {
        kind,
        geography: 'country',
        measure,
        countries: [
          { countryCode: 'US', label: 'Robot', value: 0.425 },
          { countryCode: 'CA', label: 'Missing', value: null }
        ],
        unknownCountryCodes: []
      };
    const before = JSON.stringify(frame);
    const { rerender } = render(
      <Renderer frame={frame} spec={graphic(kind)} />
    );
    const option = captured.option!;
    if (kind === 'line') {
      expect(option.yAxis.axisLabel!.formatter!(0.425)).toBe('42.5%');
      expect(option.series[0].data).toEqual([0.425, null]);
    } else if (kind === 'heatmap') {
      expect(option.series[0].data).toEqual([[0, 0, 0.425]]);
      expect(option.series[1].data).toEqual([[0, 1, 0]]);
      expect(option.series[0].label.formatter!({ value: [0, 0, 0.425] })).toBe(
        '42.5%'
      );
      expect(option.series[1].label.formatter!({ value: [0, 1, 0] })).toBe('—');
    } else {
      expect(option.series[0].label.formatter!({ value: 0.425 })).toBe('42.5%');
      expect(option.series[0].label.formatter!({ value: null })).toBe('—');
      expect(JSON.stringify(option.series[0].data)).toContain('0.425');
      expect(JSON.stringify(option.series[0].data)).toContain('null');
      const numericAxis =
        kind === 'geo-map'
          ? undefined
          : option.xAxis.type === 'value'
            ? option.xAxis
            : option.yAxis;
      if (numericAxis)
        expect(numericAxis.axisLabel!.formatter!(0.425)).toBe('42.5%');
    }
    const { top } = option.grid;
    rerender(
      <Renderer
        frame={{ ...frame, subtitle: undefined }}
        spec={graphic(kind)}
      />
    );
    expect(captured.option!.grid.top).toBe(top);
    expect(JSON.stringify(frame)).toBe(before);
  }
);

it('formats each grouped measure independently and updates when metadata changes', () => {
  const frame = source('grouped-bar');
  frame.series.push({
    name: 'Count',
    points: [{ label: 'Robot', value: -1234567.875 }]
  });
  frame.data = {
    kind: 'grouped-bar',
    entities: [{ id: 'robot', label: 'Robot' }],
    series: [
      {
        id: 'ratio',
        label: 'Ratio',
        measure: {
          id: 'ratio',
          label: 'Ratio',
          format: percentFormat('ratio')
        },
        points: [{ entityId: 'robot', value: 0.425 }]
      },
      {
        id: 'count',
        label: 'Count',
        measure: {
          id: 'count',
          label: 'Count',
          format: numberFormat(2, 'points')
        },
        points: [{ entityId: 'robot', value: -1234567.875 }]
      }
    ]
  };
  const { rerender } = render(
    <GroupedBarChart frame={frame} spec={graphic('grouped-bar')} />
  );
  expect(captured.option!.series[0].label.formatter!({ value: 0.425 })).toBe(
    '42.5%'
  );
  expect(
    captured.option!.series[1].label.formatter!({ value: -1234567.875 })
  ).toBe('-1234567.88 points');
  expect(captured.option!.yAxis.axisLabel!.formatter!(1000)).toBe('1000.00');
  const updated = {
    ...frame,
    data: {
      ...frame.data,
      series: frame.data.series.map((series) => ({
        ...series,
        measure: { ...series.measure, format: numberFormat(3, 'units') }
      }))
    }
  };
  rerender(<GroupedBarChart frame={updated} spec={graphic('grouped-bar')} />);
  expect(captured.option!.series[0].label.formatter!({ value: 0.425 })).toBe(
    '0.425 units'
  );
});

it.each([
  ['bar', BarChart],
  ['histogram', HistogramChart],
  ['line', LineChart],
  ['geo-map', GeoMap]
] as const)(
  '%s legacy numeric text has no locale grouping',
  (kind, Renderer) => {
    render(<Renderer frame={source(kind)} spec={graphic(kind)} />);
    if (kind === 'line')
      expect(captured.option!.yAxis.axisLabel!.formatter!(1234567.875)).toBe(
        '1234567.88'
      );
    else
      expect(
        captured.option!.series[0].label.formatter!({ value: 1234567.875 })
      ).toBe('1234567.88');
  }
);
