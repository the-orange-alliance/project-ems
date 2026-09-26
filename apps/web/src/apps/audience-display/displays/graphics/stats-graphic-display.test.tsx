import type { GraphicSpec, VizFrame } from '@toa-lib/models';
import { act, render, screen } from '@testing-library/react';
import { StrictMode, useEffect, type PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { StatsGraphicDisplay } from './stats-graphic-display.js';
import type { RendererProps } from './renderers/index.js';

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

const authority = (
  revision: number,
  effectiveAtMs: number,
  motion: { crossfadeMs?: number; exitMs?: number; enterMs?: number } = {},
  epoch = 'epoch'
) => ({
  authorityEpoch: epoch,
  revision,
  programRevision: revision,
  transition: {
    revision,
    effectiveAtUtc: new Date(effectiveAtMs).toISOString(),
    crossfadeMs: 0,
    exitMs: 0,
    enterMs: 500,
    gapMs: 250 as const,
    ...motion
  }
});
describe('production transition rendering', () => {
  it('preserves the outgoing keyed DOM layer and shell during same-mode replacement', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const first = frame('old');
    const { container, rerender, unmount } = render(
      <StrictMode>
        <StatsGraphicDisplay
          spec={spec}
          frame={first}
          authority={authority(1, 0)}
        />
      </StrictMode>
    );
    const outgoing = screen.getByText('old');
    const shell = container.querySelector('[data-container-mode]');
    rerender(
      <StrictMode>
        <StatsGraphicDisplay
          spec={{ ...spec, title: 'Next title' }}
          frame={frame('new')}
          authority={authority(2, 1000, { crossfadeMs: 300, enterMs: 0 })}
        />
      </StrictMode>
    );
    expect(screen.getByText('old')).toBe(outgoing);
    expect(container.querySelector('[data-container-mode]')).toBe(shell);
    expect((shell as HTMLElement).style.animationName).toBe('');
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(299));
    expect(screen.getByText('old')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('old')).not.toBeInTheDocument();
    expect(screen.getByText('new')).toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    unmount();
  });
  it('late joins sample partial motion and settled mounts have no entrance animation or timers', () => {
    vi.useFakeTimers();
    vi.setSystemTime(200);
    const { container, unmount } = render(
      <StatsGraphicDisplay
        spec={spec}
        frame={frame('score')}
        authority={authority(1, 0)}
      />
    );
    const shell = container.querySelector(
      '[data-container-mode]'
    ) as HTMLElement;
    expect(shell.style.animationName).toBe(
      'ems-container-fullscreen-enter-0-500'
    );
    expect(shell.style.animationDelay).toBe('-200ms');
    expect(shell.style.animationDuration).toBe('500ms');
    unmount();
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(60000);
    const late = render(
      <StatsGraphicDisplay
        spec={spec}
        frame={frame('settled')}
        authority={authority(1, 0)}
      />
    );
    expect(
      (late.container.querySelector('[data-container-mode]') as HTMLElement)
        .style.animationName
    ).toBe('');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('clear keeps the shell and snapshot through its full exit and never content-fades them early', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const { container, rerender } = render(
      <StatsGraphicDisplay
        spec={spec}
        frame={frame('outgoing')}
        authority={authority(1, 0)}
      />
    );
    const node = screen.getByText('outgoing');
    rerender(
      <StatsGraphicDisplay
        spec={null}
        frame={null}
        authority={{
          ...authority(2, 1000, { exitMs: 500, enterMs: 0 }),
          programRevision: null
        }}
      />
    );
    expect(screen.getByText('outgoing')).toBe(node);
    expect(
      (container.querySelector('[data-container-mode]') as HTMLElement).style
        .animationName
    ).toBe('ems-container-fullscreen-exit-1000-500');
    expect(
      node.closest('.ems-graphic-motion')?.getAttribute('style')
    ).not.toContain('ems-graphic-content-out');
    act(() => vi.advanceTimersByTime(499));
    expect(node).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(container).toBeEmptyDOMElement();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('renderer failures stay suppressed for equal-content replay but a new epoch retries identical references', () => {
    const broken = frame('broken');
    const report = vi.fn();
    const { container, rerender } = render(
      <StatsGraphicDisplay
        spec={spec}
        frame={broken}
        authority={authority(1, 0)}
        onRenderError={report}
      />
    );
    expect(container).toBeEmptyDOMElement();
    expect(report).toHaveBeenCalledTimes(1);
    rerender(
      <StatsGraphicDisplay
        spec={{ ...spec }}
        frame={{ ...broken }}
        authority={authority(1, 0)}
        onRenderError={report}
      />
    );
    expect(report).toHaveBeenCalledTimes(1);
    rerender(
      <StatsGraphicDisplay
        spec={spec}
        frame={broken}
        authority={authority(1, 0, {}, 'new-epoch')}
        onRenderError={report}
      />
    );
    expect(report).toHaveBeenCalledTimes(2);
    rerender(
      <StatsGraphicDisplay
        spec={spec}
        frame={frame('fixed')}
        authority={authority(1, 0, {}, 'new-epoch')}
        onRenderError={report}
      />
    );
    expect(screen.getByText('fixed')).toBeInTheDocument();
  });
  it('program ignores replay while PVW cuts back without animating then follows its replay deadline', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const props = {
      spec,
      frame: frame('target'),
      replayFrom: { spec, frame: frame('before') }
    };
    const program = render(<StatsGraphicDisplay {...props} replayNonce={0} />);
    program.rerender(<StatsGraphicDisplay {...props} replayNonce={1} />);
    expect(screen.queryByText('before')).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    program.unmount();
    const preview = render(
      <StatsGraphicDisplay {...props} preview replayNonce={0} />
    );
    preview.rerender(
      <StatsGraphicDisplay {...props} preview replayNonce={1} />
    );
    expect(screen.getByText('before')).toBeInTheDocument();
    expect(
      (preview.container.querySelector('[data-container-mode]') as HTMLElement)
        .style.animationName
    ).toBe('');
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(400));
    expect(screen.getByText('target')).toBeInTheDocument();
    expect(screen.getByText('before')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(300));
    expect(screen.queryByText('before')).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
  });
});

it('unrelated state revisions do not advance CSS offsets twice, while interruptions restart their motion leg', () => {
  vi.useFakeTimers();
  vi.setSystemTime(200);
  const props = { spec, frame: frame('stable'), authority: authority(1, 0) };
  const { container, rerender, unmount } = render(
    <StatsGraphicDisplay {...props} />
  );
  const shell = container.querySelector('[data-container-mode]') as HTMLElement;
  expect(shell.style.animationDelay).toBe('-200ms');
  act(() => vi.advanceTimersByTime(100));
  rerender(
    <StatsGraphicDisplay
      {...props}
      authority={{ ...props.authority, revision: 2 }}
    />
  );
  expect(shell.style.animationDelay).toBe('-200ms');
  expect(vi.getTimerCount()).toBe(1);
  act(() => vi.advanceTimersByTime(700));
  const take = (revision: number, at: number) => (
    <StatsGraphicDisplay
      spec={{ ...spec, mode: 'drawer-left' }}
      frame={frame('pending')}
      authority={authority(revision, at, { exitMs: 500, enterMs: 1250 })}
    />
  );
  rerender(take(3, 1000));
  expect(shell.style.animationName).toBe(
    'ems-container-fullscreen-exit-1000-500'
  );
  act(() => vi.advanceTimersByTime(100));
  rerender(take(4, 1100));
  expect(container.querySelector('[data-container-mode]')).toBe(shell);
  expect(shell.style.animationName).toBe(
    'ems-container-fullscreen-exit-1100-500'
  );
  expect(shell.style.animationDelay).toBe('0ms');
  expect(vi.getTimerCount()).toBe(1);
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
