import type { Rundown, ShowAdvanceResult } from '@toa-lib/models';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ON_DECK, useShowRundown } from './use-show-rundown.js';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  advance: vi.fn(),
  revalidate: vi.fn(),
  mutateProducerShow: vi.fn(),
  swrData: { current: null as Rundown | null }
}));

vi.mock('src/api/use-graphics-data.js', () => ({
  graphicsApi: {
    show: { get: mocks.get, patch: mocks.patch, advance: mocks.advance }
  },
  useProducerShow: () => ({
    data: mocks.swrData.current,
    mutate: mocks.revalidate
  }),
  mutateProducerShow: mocks.mutateProducerShow
}));

const show = (revision: number, entries: Rundown['entries']): Rundown => ({
  schemaVersion: 2,
  revision,
  rundownId: 'producer-show',
  eventKey: 'event-a',
  name: 'Producer Show',
  entries,
  updatedAtUtc: '2026-09-14T12:00:00.000Z'
});

const entry = (entryId: string, timelineId = `timeline-${entryId}`) => ({
  entryId,
  timelineId
});

/** A 409 as the HTTP client surfaces it: the relay's verbatim "CODE: reason" text. */
const conflict = () =>
  Object.assign(new Error('CONFLICT: Rundown revision changed'), {
    code: 'CONFLICT'
  });

const advanceResult = (
  overrides: Partial<ShowAdvanceResult> = {}
): ShowAdvanceResult =>
  ({
    outcome: 'loaded',
    consumedEntryId: 'e1',
    acknowledgment: { ok: true, requestId: 'r', state: {}, replayed: false },
    show: show(5, []),
    ...overrides
  }) as ShowAdvanceResult;

describe('useShowRundown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.swrData.current = null;
    mocks.patch.mockResolvedValue(show(1, []));
    mocks.advance.mockResolvedValue(advanceResult());
  });

  it('cannot resurrect entries a concurrent edit removed', async () => {
    // The hook rendered when the show held two entries; the server has since
    // dropped e1. Removing e2 from this stale render must not bring e1 back.
    mocks.swrData.current = show(4, [entry('e1'), entry('e2')]);
    mocks.get.mockResolvedValue(show(5, [entry('e2')]));
    mocks.patch
      .mockRejectedValueOnce(conflict())
      .mockResolvedValueOnce(show(6, []));

    const { result } = renderHook(() => useShowRundown('event-a'));
    await result.current.removeEntry('e2');

    // Attempt 1 carries the revision its entries actually came from, so the
    // server rejects it rather than accepting a stale array.
    expect(mocks.patch.mock.calls[0][2]).toBe(4);
    // Attempt 2 re-reads and applies the removal to what the server holds.
    expect(mocks.patch).toHaveBeenCalledTimes(2);
    expect(mocks.patch.mock.calls[1][1]).toEqual([]);
    expect(mocks.patch.mock.calls[1][2]).toBe(5);
  });

  it('writes with no cached document in hand by reading the show first', async () => {
    mocks.swrData.current = null;
    mocks.get.mockResolvedValue(show(2, [entry('e1')]));

    const { result } = renderHook(() => useShowRundown('event-a'));
    await result.current.removeEntry('e1');

    expect(mocks.get).toHaveBeenCalledWith('event-a');
    expect(mocks.patch).toHaveBeenCalledTimes(1);
    expect(mocks.patch.mock.calls[0][1]).toEqual([]);
    expect(mocks.patch.mock.calls[0][2]).toBe(2);
  });

  it('re-reads and re-applies after losing a revision race instead of replaying a stale array', async () => {
    mocks.swrData.current = show(1, [entry('e1')]);
    // A competing producer commits an append while this write is in flight.
    mocks.get.mockResolvedValue(show(2, [entry('e1'), entry('e2')]));
    mocks.patch
      .mockRejectedValueOnce(conflict())
      .mockResolvedValueOnce(show(3, []));

    const { result } = renderHook(() => useShowRundown('event-a'));
    await result.current.addEntry('timeline-new', { featured: 254 });

    expect(mocks.patch).toHaveBeenCalledTimes(2);
    // The retry is computed from the entries the winner committed, so its
    // `e2` survives and the new entry is appended after it.
    const [, retriedEntries, retriedRevision] = mocks.patch.mock.calls[1];
    expect(retriedRevision).toBe(2);
    expect(
      (retriedEntries as Rundown['entries']).map((e) => e.entryId)
    ).toEqual(['e1', 'e2', expect.any(String)]);
    expect((retriedEntries as Rundown['entries'])[2]).toMatchObject({
      timelineId: 'timeline-new',
      values: { featured: 254 }
    });
  });

  it('gives up after exhausting retries and still revalidates so the UI shows what the server holds', async () => {
    mocks.swrData.current = show(1, [entry('e1')]);
    mocks.get.mockResolvedValue(show(1, [entry('e1')]));
    mocks.patch.mockRejectedValue(conflict());

    const { result } = renderHook(() => useShowRundown('event-a'));
    await expect(result.current.removeEntry('e1')).rejects.toThrow('CONFLICT');
    await waitFor(() => expect(mocks.revalidate).toHaveBeenCalled());
  });

  it('reorders by entry id, so a concurrent edit to another entry’s values survives', async () => {
    // Someone set values on e2 between this render and the reorder.
    const editedE2 = { ...entry('e2'), values: { featured: 1114 } };
    mocks.swrData.current = null;
    mocks.get.mockResolvedValue(show(3, [entry('e1'), editedE2, entry('e3')]));

    const { result } = renderHook(() => useShowRundown('event-a'));
    await result.current.reorder(['e3', 'e1', 'e2']);

    const [, entries] = mocks.patch.mock.calls[0];
    expect((entries as Rundown['entries']).map((e) => e.entryId)).toEqual([
      'e3',
      'e1',
      'e2'
    ]);
    expect((entries as Rundown['entries'])[2]).toEqual(editedE2);
  });

  it('keeps an entry the caller did not name rather than dropping it from the order', async () => {
    mocks.swrData.current = null;
    mocks.get.mockResolvedValue(
      show(2, [entry('e1'), entry('e2'), entry('e3')])
    );

    const { result } = renderHook(() => useShowRundown('event-a'));
    await result.current.reorder(['e2', 'e1']);

    const [, entries] = mocks.patch.mock.calls[0];
    expect((entries as Rundown['entries']).map((e) => e.entryId)).toEqual([
      'e2',
      'e1',
      'e3'
    ]);
  });

  it('applies the document a successful write returned, without revalidating behind it', async () => {
    mocks.swrData.current = show(2, [entry('e1')]);
    mocks.patch.mockResolvedValue(show(3, []));

    const { result } = renderHook(() => useShowRundown('event-a'));
    await result.current.removeEntry('e1');

    // The API layer applies the returned document to SWR once; a second
    // re-read from here would race the first and could land staler (F22).
    expect(mocks.patch).toHaveBeenCalledTimes(1);
    expect(mocks.mutateProducerShow).not.toHaveBeenCalled();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });

  it('sends one advance command rather than a load-then-remove sequence', async () => {
    mocks.swrData.current = show(4, [entry('e1'), entry('e2')]);
    const { result } = renderHook(() => useShowRundown('event-a'));

    await result.current.consume({ entryId: 'e1', take: true });

    expect(mocks.advance).toHaveBeenCalledTimes(1);
    expect(mocks.advance).toHaveBeenCalledWith('event-a', {
      requestId: 'advance-e1-r4',
      entryId: 'e1',
      take: true
    });
    // No rundown PATCH: the server removed the entry as part of the command.
    expect(mocks.patch).not.toHaveBeenCalled();
  });

  it('coalesces a double invocation into one advance (double click, StrictMode effect replay)', async () => {
    mocks.swrData.current = show(4, [entry('e1')]);
    let release!: (value: ShowAdvanceResult) => void;
    mocks.advance.mockReturnValue(
      new Promise<ShowAdvanceResult>((resolve) => {
        release = resolve;
      })
    );
    const { result } = renderHook(() => useShowRundown('event-a'));

    const first = result.current.consume();
    const second = result.current.consume();
    release(advanceResult());
    const [a, b] = await Promise.all([first, second]);

    expect(mocks.advance).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);
  });

  it('derives the request id from the entry and show revision, so a retry is the SAME request', async () => {
    mocks.swrData.current = show(9, [entry('e1')]);
    const { result } = renderHook(() => useShowRundown('event-a'));

    await result.current.consume();
    await result.current.consume();

    // Both advances of the on-deck position at revision 9 carry one id, so the
    // server executes the operator's action exactly once however many times
    // the browser is provoked into sending it.
    expect(mocks.advance.mock.calls[0][1].requestId).toBe('advance-on-deck-r9');
    expect(mocks.advance.mock.calls[1][1].requestId).toBe('advance-on-deck-r9');
  });

  it('marks the entry pending while its advance is in flight, and clears it after', async () => {
    mocks.swrData.current = show(4, [entry('e1')]);
    let release!: (value: ShowAdvanceResult) => void;
    mocks.advance.mockReturnValue(
      new Promise<ShowAdvanceResult>((resolve) => {
        release = resolve;
      })
    );
    const { result } = renderHook(() => useShowRundown('event-a'));

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.consume();
    });
    await waitFor(() =>
      expect(result.current.pendingEntryIds).toEqual([ON_DECK])
    );

    await act(async () => {
      release(advanceResult());
      await pending;
    });
    expect(result.current.pendingEntryIds).toEqual([]);
  });

  it('returns a rejected advance rather than throwing, so the caller can report the server’s own reason', async () => {
    mocks.swrData.current = show(4, [entry('e1')]);
    mocks.advance.mockResolvedValue(
      advanceResult({
        outcome: 'rejected',
        consumedEntryId: null,
        acknowledgment: {
          ok: false,
          requestId: 'r',
          error: {
            code: 'CONFLICT',
            message:
              'Show revision changed; reload the rundown before advancing.',
            retryable: true
          }
        },
        show: show(6, [entry('e2')])
      } as Partial<ShowAdvanceResult>)
    );
    const { result } = renderHook(() => useShowRundown('event-a'));

    const outcome = await result.current.consume();

    expect(outcome?.outcome).toBe('rejected');
    expect(result.current.pendingEntryIds).toEqual([]);
  });

  it('exposes the entries and revision the server last committed', () => {
    mocks.swrData.current = show(7, [entry('e1')]);
    const { result } = renderHook(() => useShowRundown('event-a'));
    expect(result.current.revision).toBe(7);
    expect(result.current.entries.map((e) => e.entryId)).toEqual(['e1']);
  });
});
