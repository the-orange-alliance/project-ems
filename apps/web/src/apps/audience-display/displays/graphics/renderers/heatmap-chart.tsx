/**
 * Matrix / correlation heatmap renderer for the broadcast stats-graphics
 * system. Data arrives as `frame.columns` + `frame.rows` (a metric x metric
 * correlation matrix): one column carries the row's identifying label
 * (conventionally the first / `align: 'left'` column), and the remaining
 * columns each hold a numeric (or explicitly-null) value for that row.
 *
 * This is an on-air, transparent, non-interactive overlay — see the
 * ABSOLUTE REQUIREMENTS in the task for the constraints baked in below.
 */

import { useMemo } from 'react';
import type * as React from 'react';
import ReactEChartsImport from 'echarts-for-react';
import type { EChartsOption } from 'echarts-for-react';
import type { VizFrame, GraphicSpec } from '@toa-lib/models';
import { fontFamily, palette, echartsTheme } from '../theme.js';

// See bar-chart.tsx for why this re-assertion is needed: `echarts-for-react`
// ships CommonJS-only type declarations, so under this project's
// `moduleResolution: nodenext` + `esModuleInterop: false` a default import
// types as the whole module namespace rather than the real `EChartsReact`
// class (a TS/CJS-interop typing gap, not a runtime bug).
const ReactECharts =
  ReactEChartsImport as unknown as typeof import('echarts-for-react').default;

interface RendererProps {
  frame: VizFrame;
  spec: GraphicSpec;
}

const DEFAULT_PRECISION = 1;
/** Entry animation duration, per broadcast spec (~600-800ms, cubicOut). */
const ENTRY_ANIMATION_MS = 700;

function resolvePrecision(spec: GraphicSpec): number {
  const precision = spec.options?.precision;
  return typeof precision === 'number' && Number.isFinite(precision)
    ? precision
    : DEFAULT_PRECISION;
}

type Column = NonNullable<VizFrame['columns']>[number];
type Row = NonNullable<VizFrame['rows']>[number];

/** Picks the column that identifies the row (its label), if any. */
function pickLabelColumn(columns: Column[]): Column | undefined {
  return columns.find((c) => c.align === 'left') ?? columns[0];
}

export default function HeatmapChart({
  frame,
  spec
}: RendererProps): React.JSX.Element {
  const precision = resolvePrecision(spec);
  const columns = frame.columns ?? [];
  const rows = frame.rows ?? [];
  const fontScale = 1;

  const option: EChartsOption = useMemo(() => {
    const labelColumn = pickLabelColumn(columns);
    const valueColumns = labelColumn
      ? columns.filter((c) => c.key !== labelColumn.key)
      : columns;

    const yCategories = rows.map((row: Row, i) =>
      labelColumn && typeof row[labelColumn.key] === 'string'
        ? (row[labelColumn.key] as string)
        : `Row ${i + 1}`
    );
    const xCategories = valueColumns.map((c) => c.label);

    // Numeric cells go into one series (colored by visualMap); cells whose
    // value is explicitly null/non-numeric go into a second series with a
    // hard-coded nullNeutral color so they read as "no data", never as a
    // fabricated low/zero value. The two series are cleanly partitioned —
    // no cell appears in both.
    const numericData: [number, number, number][] = [];
    const missingData: [number, number, number][] = [];
    let min = Infinity;
    let max = -Infinity;

    rows.forEach((row: Row, yi) => {
      valueColumns.forEach((col, xi) => {
        const raw = row[col.key];
        // A value is only ever plotted as real data when it is an actual
        // finite number. Anything else (null, undefined, string, etc.) is
        // treated as explicitly missing — never coerced with `?? 0` / `|| 0`.
        if (typeof raw === 'number' && Number.isFinite(raw)) {
          numericData.push([xi, yi, raw]);
          if (raw < min) min = raw;
          if (raw > max) max = raw;
        } else {
          // The `0` here is a placeholder z-value required by the heatmap
          // series data shape (it is never used: this series' itemStyle
          // color is hard-set below to `palette.nullNeutral` and its label
          // is a fixed "N/A" string, so the placeholder is never read as,
          // displayed as, or mapped to a data value).
          missingData.push([xi, yi, 0]);
        }
      });
    });

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      // No numeric cells at all — give visualMap a harmless finite range.
      min = 0;
      max = 1;
    } else if (min === max) {
      // Avoid a degenerate visualMap range when every numeric cell matches.
      min -= 1;
      max += 1;
    }

    const cellLabelStyle = {
      color: palette.textPrimary,
      textBorderColor: 'rgba(0, 0, 0, 0.6)',
      textBorderWidth: 2,
      fontSize: 11 * fontScale,
      fontFamily
    };

    return {
      backgroundColor: 'transparent',
      animationDuration: ENTRY_ANIMATION_MS,
      animationEasing: 'cubicOut',
      animationDurationUpdate: ENTRY_ANIMATION_MS,
      animationEasingUpdate: 'cubicOut',
      tooltip: { show: false },
      toolbox: { show: false },
      grid: {
        left: 140,
        right: 24,
        top: 24,
        bottom: 80,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xCategories,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: palette.textSecondary,
          fontSize: 11 * fontScale,
          fontFamily,
          rotate: 30,
          interval: 0
        }
      },
      yAxis: {
        type: 'category',
        data: yCategories,
        splitArea: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: palette.textSecondary,
          fontSize: 11 * fontScale,
          fontFamily
        }
      },
      // Hidden (non-interactive) continuous color scale driving the brand
      // gradient. `show: false` keeps the on-air render free of any
      // draggable/interactive legend widget while still mapping colors.
      visualMap: {
        show: false,
        min,
        max,
        seriesIndex: 0,
        calculable: false,
        inRange: {
          color: [palette.gradientStart, palette.gradientEnd]
        }
      },
      series: [
        {
          name: frame.title || 'Correlation',
          type: 'heatmap',
          data: numericData,
          label: {
            show: true,
            ...cellLabelStyle,
            formatter: (p: { value: [number, number, number] }) =>
              p.value[2].toFixed(precision)
          },
          itemStyle: {
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1
          },
          emphasis: { disabled: true },
          universalTransition: true
        },
        {
          name: 'No data',
          type: 'heatmap',
          data: missingData,
          // Explicitly-missing cells: fixed neutral color, never part of
          // the visualMap's color scale (visualMap.seriesIndex above only
          // targets the numeric series).
          itemStyle: {
            color: palette.nullNeutral,
            borderColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1
          },
          label: {
            show: true,
            ...cellLabelStyle,
            color: palette.textSecondary,
            // Fixed text — never derived from the placeholder `0` value.
            formatter: () => 'N/A'
          },
          emphasis: { disabled: true },
          universalTransition: true
        }
      ],
      textStyle: {
        color: palette.textPrimary,
        fontFamily,
        textBorderColor: 'rgba(0, 0, 0, 0.5)',
        textBorderWidth: 2
      }
    };
  }, [columns, rows, precision, frame.title]);

  return (
    <ReactECharts
      option={option}
      theme={echartsTheme}
      notMerge
      opts={{ renderer: 'canvas' }}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
