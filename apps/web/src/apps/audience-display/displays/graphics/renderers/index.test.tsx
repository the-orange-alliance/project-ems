import type { GraphicSpec, VizFrame } from '@toa-lib/models';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GraphicRenderer } from './index.js';

vi.mock('../composition.js', () => ({
  isSupportedGraphicCombo: () => true,
  UnsupportedGraphicNotice: () => <div>unsupported</div>
}));
vi.mock('./stat-tile.js', () => ({
  default: ({ frame }: { frame: VizFrame }) => {
    if (frame.title === 'broken') throw new Error('renderer failed');
    return <div>{frame.title}</div>;
  }
}));
vi.mock('./data-table.js', () => ({ default: () => <div>table</div> }));
vi.mock('./ranking-table.js', () => ({ default: () => <div>ranking</div> }));
vi.mock('./bar-chart.js', () => ({ BarChart: () => <div>bar</div> }));
vi.mock('./grouped-bar-chart.js', () => ({
  GroupedBarChart: () => <div>grouped bar</div>
}));
vi.mock('./histogram-chart.js', () => ({
  HistogramChart: () => <div>histogram</div>
}));
vi.mock('./line-chart.js', () => ({ default: () => <div>line</div> }));
vi.mock('./heatmap-chart.js', () => ({ default: () => <div>heatmap</div> }));
vi.mock('./geo-map.js', () => ({ default: () => <div>map</div> }));

const spec: GraphicSpec = {
  id: 'graphic',
  title: 'Graphic',
  stat: 'score',
  selectors: {},
  filters: {},
  params: {},
  kind: 'stat-tile',
  mode: 'fullscreen',
  options: {}
};

const frame = (title: string): VizFrame => ({
  kind: 'stat-tile',
  title,
  asOfUtc: '2026-09-14T00:00:00.000Z',
  quality: 'complete',
  warnings: [],
  series: []
});

describe('GraphicRenderer', () => {
  it('fails closed with no audience diagnostic chrome and logs the failed spec', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { container } = render(
      <GraphicRenderer frame={frame('broken')} spec={spec} />
    );
    expect(container).toBeEmptyDOMElement();
    expect(log).toHaveBeenCalledWith(
      '[GraphicRenderer] renderer crashed:',
      expect.objectContaining({ spec })
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
  it('recovers when a corrected frame follows a renderer exception', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { rerender } = render(
      <GraphicRenderer frame={frame('broken')} spec={spec} />
    );
    expect(screen.queryByText('broken')).not.toBeInTheDocument();

    rerender(<GraphicRenderer frame={frame('corrected')} spec={spec} />);

    expect(screen.getByText('corrected')).toBeInTheDocument();
  });
});
