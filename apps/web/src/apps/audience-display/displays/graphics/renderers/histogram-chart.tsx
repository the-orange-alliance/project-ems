import React, { useMemo } from 'react';
import ReactEChartsImport from 'echarts-for-react';
import type { GraphicSpec, VizFrame } from '@toa-lib/models';
import { fontFamily, palette, echartsGradient } from '../theme.js';

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
 * Distribution/histogram renderer. `frame.series[0].points` carry bin
 * labels and counts, rendered as a contiguous bar chart (no category gap)
 * so it reads as a histogram rather than a spaced-out bar chart.
 *
 * `value === null` means the bin count is explicitly missing/unknown — it
 * is passed through to ECharts as `null` (never coerced to 0) so that bin
 * is left empty rather than drawn as a false zero-height bar.
 */
export const HistogramChart: React.FC<RendererProps> = ({ frame, spec }) => {
  const points = frame.series?.[0]?.points ?? [];

  const precision =
    typeof spec.options?.precision === 'number' ? spec.options.precision : 1;

  const fontSize = 16;
  const strokeWidth = 3;

  const option = useMemo(() => {
    const labels = points.map((p) => p.label);
    // Never coerce a missing bin count to 0 — pass null straight through
    // so ECharts leaves that bin empty.
    const values = points.map((p) => (p.value === null ? null : p.value));

    return {
      backgroundColor: 'transparent',
      animation: true,
      animationDuration: 700,
      animationEasing: 'cubicOut' as const,
      tooltip: { show: false },
      toolbox: { show: false },
      grid: {
        left: '6%',
        right: '6%',
        top: frame.subtitle ? '18%' : '14%',
        bottom: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category' as const,
        data: labels,
        name: frame.axis?.xLabel,
        boundaryGap: false,
        // No gap between categories so adjacent bins touch, reading as a
        // continuous distribution rather than discrete spaced bars.
        axisTick: { alignWithLabel: true },
        axisLabel: {
          color: palette.textPrimary,
          fontSize,
          fontFamily,
          textBorderColor: palette.scrim,
          textBorderWidth: strokeWidth
        },
        axisLine: { lineStyle: { color: palette.textSecondary } }
      },
      yAxis: {
        type: 'value' as const,
        name: frame.axis?.yLabel,
        axisLabel: {
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
      series: [
        {
          type: 'bar' as const,
          data: values,
          // Zero gap between bars/categories is what makes this read as a
          // histogram instead of a spaced-out bar chart.
          barCategoryGap: '0%',
          barGap: '0%',
          itemStyle: {
            color: echartsGradient(false),
            borderColor: palette.scrim,
            borderWidth: 1
          },
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
              params.value === null || params.value === undefined
                ? ''
                : params.value.toFixed(precision)
          }
        }
      ]
    };
  }, [points, frame.axis?.xLabel, frame.axis?.yLabel, precision]);

  return (
    <ReactECharts
      option={option}
      opts={{ renderer: 'canvas' }}
      notMerge
      style={{ width: '100%', height: '100%' }}
    />
  );
};

export default HistogramChart;
