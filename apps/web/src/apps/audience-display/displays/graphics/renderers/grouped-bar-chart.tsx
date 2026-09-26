import {
  formatChartValue,
  resolveChartFormat,
  resolveChartAxisFormat
} from './presentation-format.js';
import React, { useMemo } from 'react';
import ReactEChartsImport from 'echarts-for-react';
import type { GraphicSpec, VizFrame } from '@toa-lib/models';
import { fontFamily, palette, rampColor } from '../theme.js';
import { legacyPointAllianceGroup } from './presentation-format.js';

// See bar-chart.tsx for why this re-assertion is needed: `echarts-for-react`
// ships CommonJS-only type declarations, so under this project's
// `moduleResolution: nodenext` + `esModuleInterop: false` a default import
// types as the whole module namespace rather than the real `EChartsReact`
// class (a TS/CJS-interop typing gap, not a runtime bug).
const ReactECharts =
  ReactEChartsImport as unknown as typeof import('echarts-for-react').default;

export interface RendererProps {
  frame: VizFrame;
  spec: GraphicSpec;
}

/**
 * Multi-series grouped bar chart — one ECharts series per entry in
 * `frame.series`, colored along the brand ramp by series index. A legend
 * (labeled by each series' `name`) sits above the plot area but below the
 * title so the two never collide.
 *
 * `value === null` means the metric is explicitly missing for that
 * category/series combination — it is passed through to ECharts as `null`
 * (never coerced to 0) so no bar is drawn there.
 *
 * ALLIANCE GROUPING (Phase 2 of `teamsInMatchId`, modular/opt-in — see
 * `legacyPointAllianceGroup` and `bar-chart.tsx`'s fuller doc comment for the
 * shared contract). Here specifically: a bar's fill color already encodes
 * WHICH MEASURE it is (the series/legend color), so recoloring by alliance
 * (Option 1) would destroy that legend — Option 1 does not apply to this
 * renderer. Instead, ONLY Option 2 applies: categories (teams) cluster
 * red-alliance before blue-alliance, and every series' own per-measure
 * color is untouched.
 */
export const GroupedBarChart: React.FC<RendererProps> = ({ frame, spec }) => {
  const seriesList = frame.series ?? [];

  const axisFormat = resolveChartAxisFormat(frame, spec);

  const fontSize = 16;
  const legendFontSize = 13;
  const strokeWidth = 3;

  const option = useMemo(() => {
    const seriesCount = seriesList.length;

    // Categories come from the union of labels across series, preserving
    // first-seen order (paired with whichever series' point first named it,
    // for the alliance-group lookup below), so mismatched series still
    // align sensibly.
    const categoryOrder: {
      label: string;
      group: 'red' | 'blue' | undefined;
    }[] = [];
    const seen = new Set<string>();
    for (const s of seriesList) {
      for (const p of s.points ?? []) {
        if (!seen.has(p.label)) {
          seen.add(p.label);
          categoryOrder.push({
            label: p.label,
            group: legacyPointAllianceGroup(p.meta)
          });
        }
      }
    }

    // Phase 2, Option 2 ONLY here (see the component doc comment above) -
    // reorder into a red-then-blue cluster ONLY once at least one category
    // is actually grouped; stable within each cluster.
    const anyGrouped = categoryOrder.some((c) => c.group !== undefined);
    const rank = (g: 'red' | 'blue' | undefined) =>
      g === 'red' ? 0 : g === 'blue' ? 1 : 2;
    const ordered = anyGrouped
      ? categoryOrder
          .map((c, i) => ({ c, i }))
          .sort((a, b) => rank(a.c.group) - rank(b.c.group) || a.i - b.i)
          .map(({ c }) => c)
      : categoryOrder;
    const categories = ordered.map((c) => c.label);

    const echartsSeries = seriesList.map((s, seriesIndex) => {
      const byLabel = new Map(
        (s.points ?? []).map((p) => [p.label, p.value] as const)
      );
      const color = rampColor(seriesIndex, Math.max(seriesCount, 1));
      return {
        name: s.name ?? `Series ${seriesIndex + 1}`,
        type: 'bar' as const,
        // Missing categories or explicit nulls both render as no bar —
        // never coerced to 0.
        data: categories.map((label) =>
          byLabel.has(label) ? byLabel.get(label)! : null
        ),
        itemStyle: { color },
        universalTransition: true,
        label: {
          show: true,
          position: 'top' as const,
          color: palette.textPrimary,
          fontSize,
          fontFamily,
          textBorderColor: palette.scrim,
          textBorderWidth: strokeWidth,
          formatter: (params: { value: number | null }) =>
            formatChartValue(
              params.value,
              resolveChartFormat(frame, spec, seriesIndex)
            )
        }
      };
    });

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 700,
      animationEasing: 'cubicOut' as const,
      tooltip: { show: false },
      toolbox: { show: false },
      // Legend sits below the title/subtitle block, above the grid, so it
      // never overlaps the title text.
      legend: {
        show: seriesCount > 1,
        top: 0,
        left: 'center',
        textStyle: {
          color: palette.textSecondary,
          fontSize: legendFontSize,
          fontFamily,
          textBorderColor: palette.scrim,
          textBorderWidth: strokeWidth
        },
        icon: 'roundRect' as const
      },
      grid: {
        left: '6%',
        right: '6%',
        top: seriesCount > 1 ? '18%' : '8%',
        bottom: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category' as const,
        data: categories,
        name: frame.axis?.xLabel,
        axisLabel: {
          color: palette.textPrimary,
          fontSize,
          fontFamily,
          textBorderColor: palette.scrim,
          textBorderWidth: strokeWidth
        },
        axisLine: { lineStyle: { color: palette.textSecondary } },
        axisTick: { lineStyle: { color: palette.textSecondary } }
      },
      yAxis: {
        type: 'value' as const,
        name: frame.axis?.yLabel,
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
      },
      series: echartsSeries
    };
  }, [
    seriesList,
    frame.axis?.xLabel,
    frame.axis?.yLabel,
    axisFormat,
    frame.data,
    spec
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

export default GroupedBarChart;
