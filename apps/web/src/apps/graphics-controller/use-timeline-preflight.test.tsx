import type { GraphicSpec } from '@toa-lib/models';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTimelinePreflight } from './use-timeline-preflight.js';

const mocks = vi.hoisted(() => ({ queryGraphicFrame: vi.fn() }));

vi.mock('../../api/graphic-frame-query.js', () => ({
  queryGraphicFrame: mocks.queryGraphicFrame
}));
vi.mock('../../api/use-stats-data.js', () => ({
  useStatsCatalogue: () => ({
    data: [{ slug: 'score', catalogueId: 'score' }]
  })
}));
vi.mock('../../api/use-team-data.js', () => ({
  useTeamsForEvent: () => ({ data: [] })
}));
vi.mock('../../api/use-match-data.js', () => ({
  useMatchesForEvent: () => ({ data: [] })
}));

describe('useTimelinePreflight', () => {
  it('runs a fresh sweep when recheck is requested', async () => {
    const spec: GraphicSpec = {
      id: 'graphic',
      title: 'Score',
      stat: 'score',
      selectors: {},
      filters: {},
      params: {},
      kind: 'stat-tile',
      mode: 'fullscreen',
      options: {}
    };
    mocks.queryGraphicFrame.mockResolvedValue({ ok: true, frame: {} });

    const { result } = renderHook(() =>
      useTimelinePreflight('event', [spec], {}, 0)
    );
    await waitFor(() =>
      expect(mocks.queryGraphicFrame).toHaveBeenCalledTimes(1)
    );
    await waitFor(() =>
      expect(result.current.readiness.graphic).toEqual({ state: 'ready' })
    );

    act(() => result.current.recheck());

    await waitFor(() =>
      expect(mocks.queryGraphicFrame).toHaveBeenCalledTimes(2)
    );
  });
});
