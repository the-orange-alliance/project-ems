import {
  formatChartValue,
  resolveChartFormat,
  resolveChartAxisFormat
} from './presentation-format.js';
import React, { useMemo } from 'react';
import ReactEChartsImport from 'echarts-for-react';
import type { GraphicSpec, VizFrame } from '@toa-lib/models';
import {
  allianceColor,
  fontFamily,
  palette,
  rampColor,
  echartsGradient
} from '../theme.js';
import { legacyPointAllianceGroup } from './presentation-format.js';

// `echarts-for-react` ships CommonJS-only type declarations (no `exports`
// map / `.d.mts` file), so under this project's `moduleResolution: nodenext`
// + `esModuleInterop: false`, TypeScript's default-import interop types the
// binding as the whole module namespace rather than the `EChartsReact`
// class it actually exports at runtime (`exports.default`). This is a
// documented TS/CJS-interop typing gap, not a runtime bug — re-assert the
// precise type straight from the package's own declaration file.
const ReactECharts =
  ReactEChartsImport as unknown as typeof import('echarts-for-react').default;

export interface RendererProps {
  frame: VizFrame;
  spec: GraphicSpec;
}

/** Above this many categories, bars run horizontally instead of vertically. */
const HORIZONTAL_THRESHOLD = 8;

/**
 * Single-series ranked bar chart (`frame.series[0]`).
 *
 * Bars are colored with the brand gradient ramp so the ranking reads as a
 * smooth progression. `value === null` means the metric is explicitly
 * missing for that category — it is passed through to ECharts as `null`
 * (never coerced to 0) so the bar is simply absent rather than a false zero.
 *
 * ALLIANCE GROUPING (Phase 2 of `teamsInMatchId`, modular/opt-in — see
 * `legacyPointAllianceGroup`): when the stat's own `selectors.teamsInMatchId`
 * sourced this frame's teams, each point's `meta.group` carries which
 * alliance it's on. Only then — never for a plain `teamKey` selection or an
 * event-wide "all teams" leaderboard, where every point's group is
 * `undefined` — this:
 *   (1) fills each bar with the conventional red/blue alliance color instead
 *       of the ramp, and
 *   (2) clusters red-alliance bars before blue-alliance ones (stable within
 *       each cluster).
 */
export const BarChart: React.FC<RendererProps> = ({ frame, spec }) => {
  const series = frame.series ?? [];
  const rawPoints = series[0]?.points ?? [];

  // Reorder into a red-then-blue cluster ONLY once at least one point is
  // actually grouped — an ungrouped frame (the overwhelmingly common case)
  // must render in the stat's own sort order, unchanged.
  const points = useMemo(() => {
    const rawGroups = rawPoints.map((p) => legacyPointAllianceGroup(p.meta));
    if (!rawGroups.some((g) => g !== undefined)) return rawPoints;
    const clusterOrder: Record<'red' | 'blue' | 'none', number> = {
      red: 0,
      blue: 1,
      none: 2
    };
    return rawPoints
      .map((p, i) => ({ p, i, group: rawGroups[i] ?? ('none' as const) }))
      .sort(
        (a, b) => clusterOrder[a.group] - clusterOrder[b.group] || a.i - b.i
      )
      .map(({ p }) => p);
  }, [rawPoints]);

  const groups = useMemo(
    () => points.map((p) => legacyPointAllianceGroup(p.meta)),
    [points]
  );

  const format = resolveChartFormat(frame, spec);
  const axisFormat = resolveChartAxisFormat(frame, spec);

  const horizontal = points.length > HORIZONTAL_THRESHOLD;

  const fontSize = 16;
  const strokeWidth = 3;

  const option = useMemo(() => {
    const labels = points.map((p) => p.label);
    // Never coerce a missing value to 0 — pass null straight through so
    // ECharts renders no bar at all for that category.
    const values = points.map((p) => (p.value === null ? null : p.value));
    const n = values.length;

    const categoryAxis = {
      type: 'category' as const,
      data: labels,
      name: horizontal ? frame.axis?.yLabel : frame.axis?.xLabel,
      axisLabel: {
        color: palette.textPrimary,
        fontSize,
        fontFamily,
        textBorderColor: palette.scrim,
        textBorderWidth: strokeWidth
      },
      axisLine: { lineStyle: { color: palette.textSecondary } },
      axisTick: { lineStyle: { color: palette.textSecondary } },
      splitLine: { show: false }
    };

    const valueAxis = {
      type: 'value' as const,
      name: horizontal ? frame.axis?.xLabel : frame.axis?.yLabel,
      axisLabel: {
        formatter: (value: number) => formatChartValue(value, axisFormat),
        color: palette.textPrimary,
        fontSize,
        fontFamily,
        textBorderColor: palette.scrim,
        textBorderWidth: strokeWidth
      },
      axisLine: { lineStyle: { color: palette.textSecondary } },
      axisTick: { lineStyle: { color: palette.textSecondary } },
      splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.12)' } }
    };

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 700,
      animationEasing: 'cubicOut' as const,
      tooltip: { show: false },
      toolbox: { show: false },
      grid: {
        left: horizontal ? '18%' : '6%',
        right: '6%',
        top: '8%',
        bottom: '8%',
        containLabel: true
      },
      xAxis: horizontal ? valueAxis : categoryAxis,
      yAxis: horizontal ? categoryAxis : valueAxis,
      series: [
        {
          type: 'bar' as const,
          data: values.map((value, i) => ({
            value,
            itemStyle: {
              color: groups[i]
                ? allianceColor(groups[i]!)
                : n > 1
                  ? rampColor(i, n)
                  : echartsGradient(!horizontal)
            }
          })),
          barMaxWidth: 64,
          universalTransition: true,
          label: {
            show: true,
            position: horizontal ? 'right' : 'top',
            color: palette.textPrimary,
            fontSize,
            fontFamily,
            textBorderColor: palette.scrim,
            textBorderWidth: strokeWidth,
            formatter: (params: { value: number | null }) =>
              formatChartValue(params.value, format)
          }
        }
      ]
    };
  }, [
    points,
    groups,
    frame.axis?.xLabel,
    frame.axis?.yLabel,
    horizontal,
    axisFormat,
    format,
    frame.data
  ]);

  return (
    <ReactECharts
      option={option}
      opts={{ renderer: 'canvas' }}
      notMerge
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default BarChart;
