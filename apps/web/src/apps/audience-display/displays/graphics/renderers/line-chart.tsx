/**
 * Time-series line chart renderer for the broadcast stats-graphics system.
 *
 * Renders one ECharts line per `frame.series` entry, ramped across the
 * brand gradient. This is an on-air, transparent, non-interactive overlay —
 * see the ABSOLUTE REQUIREMENTS in the task for the constraints baked in
 * below (no tooltip/zoom/roam, transparent background, null !== 0, etc).
 */

import { useMemo } from 'react';
import type * as React from 'react';
import ReactEChartsImport from 'echarts-for-react';
import type { EChartsOption } from 'echarts-for-react';
import type { VizFrame, GraphicSpec } from '@toa-lib/models';
import {
  fontFamily,
  palette,
  rampColor,
  echartsGradient,
  echartsTheme
} from '../theme.js';

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

/**
 * Builds an ordered, de-duplicated list of x-axis category labels from every
 * series, preserving first-seen order. Used only for `xType === 'category'`
 * (the default) so all series align on a shared axis even if one series is
 * missing an observation that another has.
 */
function collectCategories(series: VizFrame['series']): string[] {
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const s of series) {
    for (const p of s.points ?? []) {
      if (!seen.has(p.label)) {
        seen.add(p.label);
        categories.push(p.label);
      }
    }
  }
  return categories;
}

export default function LineChart({
  frame,
  spec
}: RendererProps): React.JSX.Element {
  const precision = resolvePrecision(spec);
  const series = frame.series ?? [];
  const xType = frame.axis?.xType ?? 'category';
  const fontScale = 1;

  const option: EChartsOption = useMemo(() => {
    const seriesCount = series.length;
    const categories =
      xType === 'category' ? collectCategories(series) : undefined;

    const echartsSeries = series.map((s, i) => {
      const color = rampColor(i, Math.max(seriesCount, 1));

      // For category axes we align every series against the shared
      // `categories` list so gaps land in the right place; a label with no
      // matching point becomes an explicit `null` (never a fabricated 0).
      // For value/time axes each point carries its own x coordinate, so we
      // emit [x, y] pairs directly.
      const data =
        xType === 'category'
          ? (categories ?? []).map((label) => {
              const point = (s.points ?? []).find((p) => p.label === label);
              // point.value is `number | null` straight from the frame —
              // NEVER coerced with `?? 0` / `|| 0`. A missing point (no
              // matching label at all) is likewise represented as `null`,
              // not zero.
              return point ? point.value : null;
            })
          : (s.points ?? []).map((p) => [
              xType === 'value' ? Number(p.label) : p.label,
              p.value
            ]);

      return {
        name: s.name ?? `Series ${i + 1}`,
        type: 'line' as const,
        smooth: true,
        showSymbol: true,
        symbolSize: 6,
        // CRITICAL: a missing observation must break the line rather than
        // being silently interpolated across a gap — interpolating across
        // missing data fabricates data on air.
        connectNulls: false,
        data,
        lineStyle: { color, width: 3 },
        itemStyle: { color },
        areaStyle: {
          // Subtle gradient fill under the line using the shared brand
          // gradient helper (vertical: top -> bottom).
          color: echartsGradient(true),
          opacity: 0.18
        },
        label: { show: false },
        universalTransition: true
      };
    });

    return {
      backgroundColor: 'transparent',
      animationDuration: ENTRY_ANIMATION_MS,
      animationEasing: 'cubicOut',
      animationDurationUpdate: ENTRY_ANIMATION_MS,
      animationEasingUpdate: 'cubicOut',
      // Producer-facing fields (frame.warnings / frame.quality / frame.notes)
      // are intentionally never read anywhere in this component.
      tooltip: { show: false },
      toolbox: { show: false },
      legend:
        series.length > 1
          ? {
              show: true,
              top: 0,
              textStyle: {
                color: palette.textSecondary,
                fontSize: 12 * fontScale,
                fontFamily
              }
            }
          : { show: false },
      grid: {
        left: 56,
        right: 24,
        top: series.length > 1 ? 40 : 24,
        bottom: 40,
        containLabel: true
      },
      xAxis: {
        type: xType,
        data: categories,
        name: frame.axis?.xLabel,
        nameTextStyle: {
          color: palette.textSecondary,
          fontSize: 12 * fontScale,
          fontFamily
        },
        axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.35)' } },
        axisTick: { show: false },
        axisLabel: {
          color: palette.textSecondary,
          fontSize: 11 * fontScale,
          fontFamily
        },
        splitLine: { show: false }
      },
      yAxis: {
        type: 'value',
        name: frame.axis?.yLabel,
        nameTextStyle: {
          color: palette.textSecondary,
          fontSize: 12 * fontScale,
          fontFamily
        },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: palette.textSecondary,
          fontSize: 11 * fontScale,
          fontFamily,
          formatter: (value: number) => value.toFixed(precision)
        },
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.12)' } }
      },
      textStyle: {
        color: palette.textPrimary,
        fontFamily,
        // Stroke so text stays legible over arbitrary live video behind it.
        textBorderColor: 'rgba(0, 0, 0, 0.5)',
        textBorderWidth: 2
      },
      series: echartsSeries
    };
  }, [series, xType, precision, frame.axis?.xLabel, frame.axis?.yLabel]);

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
