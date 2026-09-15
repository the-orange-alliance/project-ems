import { Component, type ErrorInfo, type FC, type ReactNode } from 'react';
import type { VizFrame, GraphicSpec } from '@toa-lib/models';

import StatTile from './stat-tile.js';
import DataTable from './data-table.js';
import RankingTable from './ranking-table.js';
import { BarChart } from './bar-chart.js';
import { GroupedBarChart } from './grouped-bar-chart.js';
import { HistogramChart } from './histogram-chart.js';
import LineChart from './line-chart.js';
import HeatmapChart from './heatmap-chart.js';
import GeoMap from './geo-map.js';
import {
  isSupportedGraphicCombo,
  UnsupportedGraphicNotice
} from '../composition.js';

/**
 * `GraphicRenderer` is the SINGLE dispatcher from a `VizFrame.kind` to its
 * on-screen renderer. The on-air audience display, the producer's
 * preview/live-monitor, AND an editor preview all render graphics through
 * this exact component, with no simplified/"compact" alternate path — that
 * shared code path is what guarantees every consumer sees precisely what
 * the audience sees. Sizing is handled entirely by the `Stage` the
 * containers mount this inside; this component never scales its own
 * output.
 */
export interface RendererProps {
  frame: VizFrame;
  spec: GraphicSpec;
  onRenderError?: (error: Error, spec: GraphicSpec, frame: VizFrame) => void;
}

/**
 * Minimal local error boundary.
 *
 * `apps/web/src/components/errors/error-boundary.tsx` is a fallback UI
 * (antd `Button`/`Typography`, meant to be paired with `react-error-boundary`'s
 * `<ErrorBoundary FallbackComponent={...} />`) that renders a very visible
 * "An error has occured" card with a reset button. That's right for an
 * interactive app screen, but wrong here: a single graphic crashing must
 * degrade to nothing rendering at all — no visible chrome, no button,
 * nothing that could flash on the broadcast feed — so the rest of the
 * audience-display page keeps running. React error boundaries must be
 * class components (there is no hook equivalent), so this is a small local
 * one rather than reusing that fallback.
 */
class GraphicErrorBoundary extends Component<
  RendererProps & { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[GraphicRenderer] renderer crashed:', {
      error,
      info,
      spec: this.props.spec,
      frameKind: this.props.frame.kind
    });
    this.props.onRenderError?.(error, this.props.spec, this.props.frame);
  }

  componentDidUpdate(
    previous: Readonly<{
      children: ReactNode;
      frame: VizFrame;
      spec: GraphicSpec;
    }>
  ) {
    if (
      this.state.hasError &&
      (previous.frame !== this.props.frame || previous.spec !== this.props.spec)
    ) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      // Render nothing visible — a transparent, empty element so a crashed
      // graphic never white-screens (or blacks out) the rest of the
      // broadcast page.
      return null;
    }
    return this.props.children;
  }
}

function renderGraphic({ frame, spec }: RendererProps): ReactNode {
  // An unsupported kind/mode combination must produce a controlled, visible
  // error card — never a silently mangled layout. Checked against the
  // broadcast rulebook (`SUPPORTED_GRAPHIC_MODES`) before anything below
  // attempts to lay the graphic out for `spec.mode`.
  if (!isSupportedGraphicCombo(spec.kind, spec.mode)) {
    return <UnsupportedGraphicNotice kind={spec.kind} mode={spec.mode} />;
  }

  switch (frame.kind) {
    case 'stat-tile':
      return <StatTile frame={frame} spec={spec} />;
    case 'bar':
      return <BarChart frame={frame} spec={spec} />;
    case 'grouped-bar':
      return <GroupedBarChart frame={frame} spec={spec} />;
    case 'line':
      return <LineChart frame={frame} spec={spec} />;
    case 'histogram':
      return <HistogramChart frame={frame} spec={spec} />;
    case 'ranking-table':
      return <RankingTable frame={frame} spec={spec} />;
    case 'heatmap':
      return <HeatmapChart frame={frame} spec={spec} />;
    case 'geo-map':
      return <GeoMap frame={frame} spec={spec} />;
    case 'table':
      return <DataTable frame={frame} spec={spec} />;
    default:
      // Unknown or future `kind` — never render nothing and never throw.
      // Fall back to the universal table renderer, which already knows how
      // to derive a sane table from `frame.series` alone.
      return <DataTable frame={frame} spec={spec} />;
  }
}

/**
 * Maps `frame.kind` to its renderer and renders it inside an error
 * boundary. This is the ONE component both the audience display and the
 * producer preview/live-monitor use to render a graphic.
 */
export const GraphicRenderer: FC<RendererProps> = (props) => {
  return (
    <GraphicErrorBoundary
      frame={props.frame}
      spec={props.spec}
      onRenderError={props.onRenderError}
    >
      {renderGraphic(props)}
    </GraphicErrorBoundary>
  );
};

export default GraphicRenderer;

// Re-export every renderer by name for direct use elsewhere.
export {
  StatTile,
  DataTable,
  RankingTable,
  BarChart,
  GroupedBarChart,
  HistogramChart,
  LineChart,
  HeatmapChart,
  GeoMap
};
