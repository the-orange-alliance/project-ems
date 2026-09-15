import type { GraphicSpec, VersionedTimeline } from '@toa-lib/models';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimelineEditor } from './use-timeline-editor.js';

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  revalidate: vi.fn(),
  timelines: { current: [] as VersionedTimeline[] }
}));

vi.mock('src/api/use-graphics-data.js', () => ({
  graphicsApi: { update: { timeline: mocks.update } },
  useTimelines: () => ({
    data: mocks.timelines.current,
    mutate: mocks.revalidate
  })
}));

const spec = (id: string, title = id): GraphicSpec => ({
  id,
  title,
  stat: 'score',
  selectors: {},
  filters: {},
  params: {},
  kind: 'stat-tile',
  mode: 'lower-third',
  options: {}
});

const timeline = (revision: number): VersionedTimeline => ({
  schemaVersion: 2,
  revision,
  timelineId: 'timeline-a',
  eventKey: 'event-a',
  name: 'Live timeline',
  items: [spec('a'), spec('b'), spec('c')],
  updatedAtUtc: '2026-09-14T12:00:00.000Z'
});

/** A 409 as the station API's HTTP client surfaces it. */
const conflict = () =>
  Object.assign(new Error('CONFLICT: Timeline revision changed'), {
    status: 409
  });

const render = () =>
  renderHook(() => useTimelineEditor('event-a', 'timeline-a'));

describe('useTimelineEditor draft buffer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.timelines.current = [timeline(3)];
    mocks.update.mockResolvedValue(timeline(4));
  });

  it('reports the saved revision the draft is staged on', () => {
    const { result } = render();
    expect(result.current.remoteRevision).toBe(3);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.saveConflict).toBe(false);
  });

  it('saves the staged items against that revision and touches nothing else', async () => {
    const { result } = render();

    act(() => result.current.removeItem('a'));
    expect(result.current.isDirty).toBe(true);
    expect(result.current.items.map((item) => item.id)).toEqual(['b', 'c']);

    await act(async () => {
      await result.current.save();
    });

    expect(mocks.update).toHaveBeenCalledWith(
      'event-a',
      'timeline-a',
      { items: [spec('b'), spec('c')] },
      3
    );
    // The buffer is clean again, and the save reached exactly one endpoint -
    // putting the result on the transport is a separate, explicit command.
    expect(result.current.isDirty).toBe(false);
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it('sends only the fields actually staged for an unsaved binding edit', async () => {
    const { result } = render();

    act(() =>
      result.current.updateItem('b', { bindings: { teamKey: 'featured' } })
    );
    await act(async () => {
      await result.current.save();
    });

    const [[, , patch]] = mocks.update.mock.calls;
    expect(patch.variables).toBeUndefined();
    expect(patch.items[1].bindings).toEqual({ teamKey: 'featured' });
  });

  it('keeps the draft and re-reads the winner when a save loses a revision race', async () => {
    mocks.update.mockRejectedValue(conflict());
    const { result } = render();

    act(() => result.current.reorder([spec('c'), spec('b'), spec('a')]));
    await act(async () => {
      await expect(result.current.save()).rejects.toThrow('CONFLICT');
    });

    // Neither version is discarded: the staged edit is still here in full,
    // and the revision that actually won is re-read into the cache.
    expect(result.current.saveConflict).toBe(true);
    expect(result.current.isDirty).toBe(true);
    expect(result.current.items.map((item) => item.id)).toEqual([
      'c',
      'b',
      'a'
    ]);
    expect(mocks.revalidate).toHaveBeenCalledTimes(1);
    expect(result.current.isSaving).toBe(false);
  });

  it('clears the conflict when the draft is reverted', async () => {
    mocks.update.mockRejectedValue(conflict());
    const { result } = render();

    act(() => result.current.removeItem('a'));
    await act(async () => {
      await expect(result.current.save()).rejects.toThrow();
    });
    expect(result.current.saveConflict).toBe(true);

    act(() => result.current.revert());
    expect(result.current.saveConflict).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.items.map((item) => item.id)).toEqual([
      'a',
      'b',
      'c'
    ]);
  });

  it('does not mark a non-conflict failure as a lost race', async () => {
    mocks.update.mockRejectedValue(
      Object.assign(new Error('Service unavailable'), { status: 503 })
    );
    const { result } = render();

    act(() => result.current.removeItem('a'));
    await act(async () => {
      await expect(result.current.save()).rejects.toThrow('Service');
    });

    expect(result.current.saveConflict).toBe(false);
    expect(result.current.isDirty).toBe(true);
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it('clears the conflict once a later save commits', async () => {
    mocks.update.mockRejectedValueOnce(conflict());
    const { result } = render();

    act(() => result.current.removeItem('a'));
    await act(async () => {
      await expect(result.current.save()).rejects.toThrow();
    });
    expect(result.current.saveConflict).toBe(true);

    mocks.timelines.current = [timeline(5)];
    await act(async () => {
      await result.current.save();
    });

    await waitFor(() => expect(result.current.saveConflict).toBe(false));
    expect(result.current.isDirty).toBe(false);
  });
});
