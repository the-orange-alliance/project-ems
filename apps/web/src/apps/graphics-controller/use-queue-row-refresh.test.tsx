import type { GraphicSpec, RundownEntry, Timeline } from '@toa-lib/models';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_BACKGROUND_QUERIES } from '../../api/bounded-query-scheduler.js';
import { useQueueRowRefresh } from './use-queue-row-refresh.js';

const mocks = vi.hoisted(() => ({ post: vi.fn() }));

vi.mock('../../api/http-clients.js', () => ({
  localClient: { post: mocks.post }
}));

const spec = (id: string, teamKey?: number): GraphicSpec => ({
  id,
  title: id,
  stat: 'score',
  selectors: teamKey === undefined ? {} : { teamKey },
  ...(teamKey === undefined ? { bindings: { teamKey: 'featured' } } : {}),
  filters: {},
  params: {},
  kind: 'stat-tile',
  mode: 'fullscreen',
  options: {}
});

const timelineOf = (items: GraphicSpec[]): Timeline => ({
  timelineId: 'timeline-a',
  eventKey: 'event-a',
  name: 'Timeline A',
  items,
  updatedAtUtc: '2026-09-14T12:00:00.000Z'
});

const entry: RundownEntry = { entryId: 'e1', timelineId: 'timeline-a' };

describe('useQueueRowRefresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.post.mockResolvedValue({});
  });

  it('reports a partial failure as partial instead of as a completed refresh', async () => {
    mocks.post
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('calculator exploded'))
      .mockResolvedValueOnce({});
    const { result } = renderHook(() => useQueueRowRefresh());

    const counts = await result.current.refreshEntry(
      'event-a',
      entry,
      timelineOf([spec('a', 1), spec('b', 2), spec('c', 3)])
    );

    expect(counts).toEqual({
      attempted: 3,
      succeeded: 2,
      unavailable: 0,
      failed: 1
    });
    await waitFor(() =>
      expect(result.current.refreshInfo.e1.fetching).toBe(false)
    );
    // Something genuinely came back, so a freshness timestamp is earned - but
    // the failure is recorded alongside it rather than erased by it.
    expect(result.current.refreshInfo.e1.lastRefreshedAtUtc).not.toBeNull();
    expect(result.current.refreshInfo.e1.failed).toBe(1);
  });

  it('never claims a refresh when every item failed', async () => {
    mocks.post.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useQueueRowRefresh());

    const counts = await result.current.refreshEntry(
      'event-a',
      entry,
      timelineOf([spec('a', 1), spec('b', 2)])
    );

    expect(counts).toEqual({
      attempted: 2,
      succeeded: 0,
      unavailable: 0,
      failed: 2
    });
    await waitFor(() =>
      expect(result.current.refreshInfo.e1.fetching).toBe(false)
    );
    // The whole point of F10: this row must not read as "last refresh at ..".
    expect(result.current.refreshInfo.e1.lastRefreshedAtUtc).toBeNull();
    // It was still ATTEMPTED, and says so - the two facts are separate.
    expect(result.current.refreshInfo.e1.lastAttemptedAtUtc).not.toBeNull();
    expect(result.current.refreshInfo.e1.startedAtUtc).not.toBeNull();
  });

  it('timestamps completion only after the work actually finishes', async () => {
    let release!: () => void;
    mocks.post.mockReturnValue(
      new Promise<void>((resolve) => {
        release = () => resolve();
      })
    );
    const { result } = renderHook(() => useQueueRowRefresh());

    const pending = result.current.refreshEntry(
      'event-a',
      entry,
      timelineOf([spec('a', 1)])
    );
    await waitFor(() =>
      expect(result.current.refreshInfo.e1?.fetching).toBe(true)
    );
    // In flight: started, but nothing completed yet.
    expect(result.current.refreshInfo.e1.startedAtUtc).not.toBeNull();
    expect(result.current.refreshInfo.e1.lastRefreshedAtUtc).toBeNull();

    release();
    await pending;
    await waitFor(() =>
      expect(result.current.refreshInfo.e1.lastRefreshedAtUtc).not.toBeNull()
    );
  });

  it('reports an item whose bindings do not resolve as unavailable, and queries nothing for it', async () => {
    const { result } = renderHook(() => useQueueRowRefresh());

    const counts = await result.current.refreshEntry(
      'event-a',
      entry,
      // `spec('a')` declares a `featured` binding this entry has no value for.
      timelineOf([spec('a'), spec('b', 2)])
    );

    expect(counts).toEqual({
      attempted: 1,
      succeeded: 1,
      unavailable: 1,
      failed: 0
    });
    expect(mocks.post).toHaveBeenCalledTimes(1);
  });

  it('records nothing at all when there is no timeline yet, so a later attempt can still run', async () => {
    const { result } = renderHook(() => useQueueRowRefresh());

    // This is the F19 shape: the show's SWR response arrived before the
    // timelines'. Marking the row done here is what made the warm permanently
    // skippable.
    expect(await result.current.refreshEntry('event-a', entry, undefined)).toBe(
      null
    );
    expect(result.current.refreshInfo.e1).toBeUndefined();
    expect(mocks.post).not.toHaveBeenCalled();

    const counts = await result.current.refreshEntry(
      'event-a',
      entry,
      timelineOf([spec('a', 1)])
    );
    expect(counts?.succeeded).toBe(1);
  });

  it('holds the shared concurrency ceiling across a long timeline', async () => {
    let running = 0;
    let peak = 0;
    const releases: (() => void)[] = [];
    mocks.post.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          running += 1;
          peak = Math.max(peak, running);
          releases.push(() => {
            running -= 1;
            resolve();
          });
        })
    );
    const { result } = renderHook(() => useQueueRowRefresh());

    const items = Array.from({ length: MAX_BACKGROUND_QUERIES + 8 }, (_, i) =>
      spec(`item-${i}`, i + 1)
    );
    const pending = result.current.refreshEntry(
      'event-a',
      entry,
      timelineOf(items)
    );

    // Drain until everything has run, checking the ceiling holds throughout -
    // the old version fired all of them at once.
    while (releases.length > 0 || running > 0) {
      expect(running).toBeLessThanOrEqual(MAX_BACKGROUND_QUERIES);
      releases.shift()?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const counts = await pending;

    expect(peak).toBe(MAX_BACKGROUND_QUERIES);
    expect(counts?.attempted).toBe(items.length);
  });

  it('returns a stable object identity so an effect reading it does not re-run every render', () => {
    const { result, rerender } = renderHook(() => useQueueRowRefresh());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
