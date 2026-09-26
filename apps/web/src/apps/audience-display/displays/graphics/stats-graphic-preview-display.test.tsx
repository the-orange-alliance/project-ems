import type { GraphicSpec } from '@toa-lib/models';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphicFrameResult } from 'src/api/graphic-frame-query.js';
import type { PreviewFrameState } from './use-preview-frame.js';
import { StatsGraphicPreviewDisplay } from './stats-graphic-preview-display.js';
import type { StatsGraphicDisplayProps } from './stats-graphic-display.js';

const mocks = vi.hoisted(() => ({
  state: vi.fn(),
  display: vi.fn(),
  nonce: 0
}));
vi.mock('./use-preview-frame.js', () => ({ usePreviewFrame: mocks.state }));
vi.mock('./use-preview-replay-nonce.js', () => ({
  usePreviewReplayNonce: () => mocks.nonce
}));
vi.mock('./stats-graphic-display.js', () => ({
  StatsGraphicDisplay: (props: StatsGraphicDisplayProps) => {
    mocks.display(props);
    return <div>{props.spec?.title}</div>;
  }
}));
const spec: GraphicSpec = {
  id: 'B',
  title: 'Cue B',
  stat: 'score',
  selectors: {},
  filters: {},
  params: {},
  options: {},
  kind: 'stat-tile',
  mode: 'fullscreen'
};
const previous: GraphicFrameResult = {
  spec: { ...spec, id: 'A', title: 'Cue A' },
  frame: {
    kind: 'stat-tile',
    title: 'Cue A',
    series: [],
    warnings: [],
    quality: 'complete',
    asOfUtc: '2026-09-15T00:00:00.000Z'
  },
  calculatedAsOfUtc: '2026-09-15T00:00:00.000Z',
  latestPlayedMatch: null,
  cache: 'miss',
  cacheAgeMs: 0,
  refreshQueued: false,
  warnings: [],
  quality: 'complete'
};
const ui = () => <StatsGraphicPreviewDisplay eventKey='event' spec={spec} />;
beforeEach(() => {
  mocks.nonce = 0;
});

describe('PVW diagnostics', () => {
  it('labels retained A as calculating B, holds replay, and only supplies B once ready', () => {
    const retry = vi.fn();
    mocks.state.mockReturnValue({
      status: 'ready',
      source: 'preview',
      data: previous,
      requestedIdentity: 'A',
      retry
    } satisfies PreviewFrameState);
    const { rerender } = render(ui());
    mocks.nonce = 1;
    mocks.state.mockReturnValue({
      status: 'loading',
      source: 'preview',
      previous,
      requestedIdentity: 'B',
      retry
    } satisfies PreviewFrameState);
    rerender(ui());
    expect(screen.getByRole('status')).toHaveTextContent(
      'CALCULATING NEXT CUE'
    );
    expect(screen.getByRole('status')).toHaveAttribute(
      'data-requested-identity',
      'B'
    );
    expect(screen.getByText(/Requested cue: Cue B/)).toHaveTextContent(
      'previous cue shown underneath'
    );
    expect(mocks.display.mock.calls.at(-1)?.[0]).toMatchObject({
      spec: previous.spec,
      frame: previous.frame,
      replayNonce: 0
    });
    const next = {
      ...previous,
      spec,
      frame: { ...previous.frame, title: 'Cue B' }
    };
    mocks.state.mockReturnValue({
      status: 'ready',
      source: 'preview',
      data: next,
      requestedIdentity: 'B',
      retry
    } satisfies PreviewFrameState);
    rerender(ui());
    expect(screen.queryByText('CALCULATING NEXT CUE')).not.toBeInTheDocument();
    expect(mocks.display.mock.calls.at(-1)?.[0]).toMatchObject({
      spec,
      frame: next.frame,
      replayNonce: 1
    });
  });

  it.each(['error', 'unavailable'] as const)(
    'shows accessible %s diagnostics and retries',
    (status) => {
      const retry = vi.fn();
      mocks.state.mockReturnValue(
        status === 'error'
          ? {
              status,
              source: 'query',
              error: {
                kind: 'network',
                message: 'Connection lost',
                cause: null
              },
              retry
            }
          : {
              status,
              source: 'query',
              code: 'insufficient_data',
              reason: 'No played matches',
              retry
            }
      );
      render(ui());
      expect(screen.getByRole('alert')).toHaveTextContent(
        status === 'error' ? 'Connection lost' : 'No played matches'
      );
      fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
      expect(retry).toHaveBeenCalledOnce();
    }
  );

  it('shows valid empty and no-next-cue copy separately from failures', () => {
    mocks.state.mockReturnValue({
      status: 'ready',
      source: 'preview',
      data: {
        ...previous,
        frame: { ...previous.frame, emptyReason: 'No eligible matches' }
      },
      retry: vi.fn()
    });
    const { rerender } = render(ui());
    expect(screen.getByRole('status')).toHaveTextContent(
      'Next cue calculated: No eligible matches'
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    mocks.state.mockReturnValue({
      status: 'ready',
      source: 'preview',
      data: null,
      retry: vi.fn()
    });
    rerender(ui());
    expect(screen.getByRole('status')).toHaveTextContent('No next cue');
  });

  it('reports renderer failure off-air, permits retry, and clears for another identity', () => {
    mocks.state.mockReturnValue({
      status: 'ready',
      source: 'preview',
      data: previous,
      requestedIdentity: 'A',
      retry: vi.fn()
    });
    const { rerender } = render(ui());
    act(() =>
      mocks.display.mock.calls
        .at(-1)?.[0]
        .onRenderError(
          new Error('Renderer crashed'),
          previous.spec,
          previous.frame
        )
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Renderer crashed');
    fireEvent.click(screen.getByRole('button', { name: 'Retry preview' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    act(() =>
      mocks.display.mock.calls
        .at(-1)?.[0]
        .onRenderError(
          new Error('Renderer crashed'),
          previous.spec,
          previous.frame
        )
    );
    mocks.state.mockReturnValue({
      status: 'loading',
      source: 'preview',
      requestedIdentity: 'B',
      retry: vi.fn()
    });
    rerender(ui());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'CALCULATING NEXT CUE'
    );
  });
});
