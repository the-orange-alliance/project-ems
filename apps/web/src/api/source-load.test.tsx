import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { describe, expect, it, vi } from 'vitest';
import { useStatsCatalogue } from './use-stats-data.js';
import { useTeamsForEvent } from './use-team-data.js';
import { useMatchesForEvent } from './use-match-data.js';
import { useTimelines } from './use-graphics-data.js';
import { requestLoadState } from './load-state.js';

const mocks = vi.hoisted(() => {
  vi.resetModules();
  return { get: vi.fn() };
});
vi.mock('./http-clients.js', () => ({ localClient: { get: mocks.get } }));
describe('source response loading and recovery', () => {
  it('accepts the service catalogue and normalizes generic stats without a season', async () => {
    const { catalogueMetadata } = await import('@toa-lib/models/seasons/stats');
    const rows = catalogueMetadata('fgc_2026');
    mocks.get.mockResolvedValue(rows);
    const cache = new Map();
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => cache, shouldRetryOnError: false }}>
        {children}
      </SWRConfig>
    );
    const { result } = renderHook(() => useStatsCatalogue('event'), {
      wrapper
    });
    await waitFor(() => expect(result.current.data).toHaveLength(rows.length));
    expect(result.current.error).toBeUndefined();
    expect(result.current.data?.some((row) => row.seasonKey === null)).toBe(
      true
    );
  });
  it.each([
    ['catalogue', useStatsCatalogue],
    ['teams', useTeamsForEvent],
    ['matches', useMatchesForEvent],
    ['timelines', useTimelines]
  ] as const)(
    '%s rejects a missing response and recovers to valid empty data',
    async (source, useSource) => {
      mocks.get.mockReset().mockResolvedValueOnce(null).mockResolvedValue([]);
      const cache = new Map();
      const wrapper = ({ children }: PropsWithChildren) => (
        <SWRConfig value={{ provider: () => cache, shouldRetryOnError: false }}>
          {children}
        </SWRConfig>
      );
      const { result } = renderHook(() => useSource('event'), { wrapper });
      await waitFor(() => expect(result.current.error).toBeDefined());
      expect(requestLoadState<unknown>(source, result.current)).toMatchObject({
        status: 'error',
        source,
        error: { kind: 'validation' }
      });
      await act(async () => {
        await result.current.mutate();
      });
      await waitFor(() => expect(result.current.data).toEqual([]));
      expect(result.current.error).toBeUndefined();
    }
  );
  it('rejects malformed catalogue entries before producer filtering or preview lookup', async () => {
    mocks.get.mockResolvedValue([{ slug: 'score' }]);
    const cache = new Map();
    const wrapper = ({ children }: PropsWithChildren) => (
      <SWRConfig value={{ provider: () => cache, shouldRetryOnError: false }}>
        {children}
      </SWRConfig>
    );
    const { result } = renderHook(() => useStatsCatalogue('event'), {
      wrapper
    });
    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(requestLoadState('catalogue', result.current)).toMatchObject({
      status: 'error',
      error: { kind: 'validation' }
    });
  });
});
