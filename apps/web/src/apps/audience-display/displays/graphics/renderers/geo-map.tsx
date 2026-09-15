import { formatChartValue, resolveChartFormat } from './presentation-format.js';
/**
 * Geographic distribution renderer for the broadcast stats-graphics system
 * (e.g. "teams by country").
 *
 * ECharts requires a registered map GeoJSON before a `map` series will
 * render anything, and no GeoJSON asset ships with this repo — fetching one
 * from the internet at runtime is not an option, since the display must
 * keep working offline at a competition venue with no network.
 *
 * So this component is a graceful TWO-MODE renderer:
 *   1. If some other part of the app has already registered a world map
 *      under the name `'world'` (via `echarts.registerMap('world', geoJson)`
 *      — e.g. a future asset bundled into the app), we render a real
 *      choropleth `map` series.
 *   2. OTHERWISE (the current, GeoJSON-less state of the repo) we fall back
 *      to a clean horizontal ranked bar chart of countries by value, using
 *      the brand ramp. This looks intentional on air, not like a missing
 *      feature.
 *
 * Dropping a world GeoJSON asset into the app later and registering it
 * under the name `'world'` upgrades this component to the choropleth
 * automatically — no code change required here.
 */

import { useMemo } from 'react';
import type * as React from 'react';
import * as echarts from 'echarts';
import ReactEChartsImport from 'echarts-for-react';
import type { EChartsOption } from 'echarts-for-react';
import type { VizFrame, GraphicSpec } from '@toa-lib/models';
import type { Json } from '@toa-lib/models/seasons/stats/presentation';
import { fontFamily, palette, rampColor, echartsTheme } from '../theme.js';

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
  compact?: boolean;
}

/** Entry animation duration, per broadcast spec (~600-800ms, cubicOut). */
const ENTRY_ANIMATION_MS = 700;
/** Name a world map must be registered under (via `echarts.registerMap`)
 *  for this component to switch into choropleth mode. */
const WORLD_MAP_NAME = 'world';

type Point = VizFrame['series'][number]['points'][number];

/** Meta keys, in priority order, that might carry a country name/code. */
const META_COUNTRY_KEYS = [
  'country',
  'countryName',
  'countryCode',
  'code',
  'name'
];

/** Extracts a country name/code from a point's `meta`, falling back to `label`. */
function countryOf(point: Point): string {
  const meta = point.meta as Json | undefined;
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    for (const key of META_COUNTRY_KEYS) {
      const value = (meta as Record<string, Json>)[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
  }
  return point.label;
}

interface CountryItem {
  name: string;
  value: number | null;
}

/** Flattens every series' points into one country -> value list. */
function collectCountryItems(series: VizFrame['series']): CountryItem[] {
  const items: CountryItem[] = [];
  for (const s of series) {
    for (const p of s.points ?? []) {
      // p.value is `number | null` straight from the frame — never coerced.
      items.push({ name: countryOf(p), value: p.value });
    }
  }
  return items;
}

/** Sorts items by value (nulls always last, order-independent) honoring `sortDir`. */
function sortCountryItems(
  items: CountryItem[],
  sortDir: 'asc' | 'desc'
): CountryItem[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (a.value === null && b.value === null) return 0;
    if (a.value === null) return 1;
    if (b.value === null) return -1;
    return sortDir === 'asc' ? a.value - b.value : b.value - a.value;
  });
  return copy;
}

/** Detects whether a `'world'` map GeoJSON has already been registered
 *  elsewhere in the app. Never fetches anything — purely a local lookup. */
function hasWorldMapRegistered(): boolean {
  try {
    return Boolean(echarts.getMap(WORLD_MAP_NAME));
  } catch {
    return false;
  }
}

export default function GeoMap({
  frame,
  spec,
  compact
}: RendererProps): React.JSX.Element {
  const format = resolveChartFormat(frame, spec);
  const series = frame.series ?? [];
  const fontScale = compact ? 0.75 : 1;
  const choroplethAvailable = useMemo(hasWorldMapRegistered, []);

  const option: EChartsOption = useMemo(() => {
    const sortDir = spec.options?.sortDir ?? 'desc';
    const limit = spec.options?.limit;
    let items = sortCountryItems(collectCountryItems(series), sortDir);
    if (typeof limit === 'number' && limit > 0) {
      items = items.slice(0, limit);
    }

    const numericValues = items
      .map((i) => i.value)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    let min = numericValues.length ? Math.min(...numericValues) : 0;
    let max = numericValues.length ? Math.max(...numericValues) : 1;
    if (min === max) {
      min -= 1;
      max += 1;
    }

    const sharedTextStyle = {
      color: palette.textPrimary,
      fontFamily,
      textBorderColor: 'rgba(0, 0, 0, 0.5)',
      textBorderWidth: 2
    };

    const sharedTop: EChartsOption = {
      backgroundColor: 'transparent',
      animationDuration: ENTRY_ANIMATION_MS,
      animationEasing: 'cubicOut',
      animationDurationUpdate: ENTRY_ANIMATION_MS,
      animationEasingUpdate: 'cubicOut',
      tooltip: { show: false },
      toolbox: { show: false },
      textStyle: sharedTextStyle
    };

    if (choroplethAvailable) {
      // --- Mode 1: real choropleth, driven by a registered 'world' map. ---
      return {
        ...sharedTop,
        visualMap: {
          show: false,
          min,
          max,
          calculable: false,
          inRange: { color: [palette.gradientStart, palette.gradientEnd] }
        },
        series: [
          {
            name: frame.title || 'Distribution',
            type: 'map',
            map: WORLD_MAP_NAME,
            roam: false,
            silent: true,
            // Explicitly-missing (null) countries fall back to this fixed
            // neutral color rather than being colored by the value scale.
            itemStyle: {
              areaColor: palette.nullNeutral,
              borderColor: 'rgba(255, 255, 255, 0.2)',
              borderWidth: 0.5
            },
            emphasis: { disabled: true },
            label: { show: false },
            data: items.map((i) => ({ name: i.name, value: i.value })),
            universalTransition: true
          }
        ]
      };
    }

    // --- Mode 2 (fallback, current default): ranked horizontal bar chart. ---
    // Reverse so the highest rank renders at the top of the category axis
    // (ECharts category axes render bottom-to-top by default).
    const ranked = [...items].reverse();
    const total = items.length;

    return {
      ...sharedTop,
      grid: {
        left: compact ? 90 : 140,
        right: compact ? 24 : 40,
        top: compact ? 12 : 20,
        bottom: compact ? 12 : 20,
        containLabel: true
      },
      xAxis: {
        type: 'value',
        show: false,
        min: 0
      },
      yAxis: {
        type: 'category',
        data: ranked.map((i) => i.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: palette.textSecondary,
          fontSize: 12 * fontScale,
          fontFamily
        }
      },
      series: [
        {
          name: frame.title || 'Distribution',
          type: 'bar',
          // NOTE: `value` stays `number | null` here — never `?? 0` / `|| 0`.
          // A null-value country simply renders no bar (ECharts treats a
          // null bar value as absent, not as a zero-length bar).
          data: ranked.map((item, idx) => {
            // Rank color follows the item's original (sorted) position, not
            // its reversed display position, so the top-ranked bar always
            // gets the ramp's leading color.
            const rank = total - 1 - idx;
            return {
              value: item.value,
              itemStyle: { color: rampColor(rank, Math.max(total, 1)) }
            };
          }),
          barMaxWidth: compact ? 14 : 22,
          label: {
            show: !compact,
            position: 'right',
            ...sharedTextStyle,
            fontSize: 12 * fontScale,
            formatter: (p: { value: number | null }) =>
              formatChartValue(p.value, format)
          },
          emphasis: { disabled: true },
          universalTransition: true
        }
      ]
    };
  }, [
    series,
    spec.options?.sortDir,
    spec.options?.limit,
    choroplethAvailable,
    compact,
    format,
    frame.data,
    fontScale,
    frame.title
  ]);

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
