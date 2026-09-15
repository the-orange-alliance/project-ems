import type { GraphicSpec, VizFrame } from '@toa-lib/models';
import { render, screen } from '@testing-library/react';
import { useEffect, type PropsWithChildren, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StatsGraphicDisplay } from './stats-graphic-display.js';
import type { RendererProps } from './renderers/index.js';

vi.mock('./transition-engine.js', () => ({
  useGraphicTransition: (spec: GraphicSpec | null, frame: VizFrame | null) => ({
    phase: 'shown',
    displayedSpec: spec,
    displayedFrame: frame,
    cutting: false
  })
}));
vi.mock('./content-crossfade.js', () => ({
  default: ({
    spec,
    frame,
    renderLayer
  }: {
    spec: GraphicSpec;
    frame: VizFrame;
    renderLayer: (spec: GraphicSpec, frame: VizFrame) => ReactNode;
  }) => renderLayer(spec, frame)
}));
vi.mock('src/components/animations/index.js', () => {
  const Wrapper = ({ children }: PropsWithChildren) => <div>{children}</div>;
  return {
    FadeInOut: Wrapper,
    SlideInBottom: Wrapper,
    SlideInLeft: Wrapper,
    SlideInRight: Wrapper
  };
});
vi.mock('./containers/fullscreen.js', () => ({
  FullscreenShell: ({ children }: PropsWithChildren) => (
    <div>Shell{children}</div>
  ),
  FullscreenPayload: ({
    children,
    title
  }: PropsWithChildren<{ title: string }>) => (
    <div>
      {title}
      {children}
    </div>
  )
}));
vi.mock('./renderers/index.js', () => ({
  GraphicRenderer: ({ frame, spec, onRenderError }: RendererProps) => {
    useEffect(() => {
      if (frame.title === 'broken')
        onRenderError?.(new Error('Crash'), spec, frame);
    }, [frame, spec, onRenderError]);
    return frame.title === 'broken' ? null : <div>{frame.title}</div>;
  }
}));
const spec: GraphicSpec = {
  id: 'A',
  title: 'Audience title',
  stat: 'score',
  selectors: {},
  filters: {},
  params: {},
  options: {},
  kind: 'stat-tile',
  mode: 'fullscreen'
};
const frame = (title: string): VizFrame => ({
  kind: 'stat-tile',
  title,
  series: [],
  quality: 'complete',
  warnings: [],
  asOfUtc: '2026-09-15T00:00:00.000Z'
});
describe('PGM fail-closed output', () => {
  it('removes the entire graphic shell after a renderer failure and recovers with a corrected frame', () => {
    const { container, rerender } = render(
      <StatsGraphicDisplay spec={spec} frame={frame('broken')} />
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    rerender(
      <StatsGraphicDisplay spec={spec} frame={frame('Corrected score')} />
    );
    expect(screen.getByText('Corrected score')).toBeInTheDocument();
  });
  it('is transparent when there is no source frame', () => {
    const { container } = render(
      <StatsGraphicDisplay spec={null} frame={null} />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
