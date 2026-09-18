import type { GraphicSpec, VizFrame } from '@toa-lib/models';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GraphicFrameOutcome } from 'src/api/graphic-frame-query.js';
import { LoadError } from 'src/api/load-state.js';
import {
  rosterIdentity,
  stableIdentity,
  usePreviewFrame
} from './use-preview-frame.js';

const mocks = vi.hoisted(() => ({
  catalogue: vi.fn(),
  teams: vi.fn(),
  matches: vi.fn(),
  query: vi.fn()
}));
vi.mock('src/api/use-stats-data.js', () => ({
  useStatsCatalogue: mocks.catalogue
}));
vi.mock('src/api/use-team-data.js', () => ({ useTeamsForEvent: mocks.teams }));
vi.mock('src/api/use-match-data.js', () => ({
  useMatchesForEvent: mocks.matches
}));
vi.mock('src/api/graphic-frame-query.js', () => ({
  queryGraphicFrame: mocks.query
}));

const spec = (id: string): GraphicSpec => ({
  id,
  title: id,
  stat: 'score',
  selectors: {},
  filters: {},
  params: {},
  options: {},
  kind: 'stat-tile',
  mode: 'fullscreen'
});
const outcome = (id: string, empty = false): GraphicFrameOutcome => ({
  ok: true,
  result: {
    spec: spec(id),
    frame: {
      kind: 'stat-tile',
      title: id,
      series: [],
      ...(empty ? { emptyReason: 'No eligible matches' } : {}),
      warnings: [],
      quality: 'complete',
      asOfUtc: '2026-09-15T00:00:00.000Z'
    } as VizFrame,
    calculatedAsOfUtc: '2026-09-15T00:00:00.000Z',
    cache: 'miss',
    cacheAgeMs: 0,
    refreshQueued: false,
    warnings: [],
    quality: 'complete',
    latestPlayedMatch: null
  }
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function mount(id = 'A', eventKey = 'event-a') {
  const cache = new Map();
  const wrapper = ({ children }: PropsWithChildren) => (
    <SWRConfig
      value={{
        provider: () => cache,
        dedupingInterval: 0,
        shouldRetryOnError: false
      }}
    >
      {children}
    </SWRConfig>
  );
  return renderHook(
    ({ id, eventKey }: { id: string | null; eventKey: string }) =>
      usePreviewFrame(eventKey, id ? spec(id) : null),
    { initialProps: { id: id as string | null, eventKey }, wrapper }
  );
}

beforeEach(() => {
  mocks.catalogue.mockReturnValue({
    data: [{ slug: 'score', catalogueId: 'A1' }],
    mutate: vi.fn()
  });
  mocks.teams.mockReturnValue({
    data: [{ teamKey: 1, teamNumber: '1', teamNameShort: 'Old name' }],
    mutate: vi.fn()
  });
  mocks.matches.mockReturnValue({
    data: [
      {
        id: 1,
        tournamentKey: 'q',
        name: 'Match 1',
        participants: [{ teamKey: 1, station: 11 }]
      }
    ],
    mutate: vi.fn()
  });
  mocks.query
    .mockReset()
    .mockImplementation(async (_key, requested) => outcome(requested.id));
});

describe('preview load identity', () => {
  it('shows calculating during a delayed retry and recovers to ready', async () => {
    const next = deferred<GraphicFrameOutcome>();
    mocks.query
      .mockRejectedValueOnce(new TypeError('Connection lost'))
      .mockReturnValue(next.promise);
    const { result } = mount();
    await waitFor(() => expect(result.current.status).toBe('error'));
    let retry!: Promise<unknown>;
    act(() => {
      retry = result.current.retry();
    });
    await waitFor(() => expect(result.current.status).toBe('loading'));
    await act(async () => {
      next.resolve(outcome('A'));
      await retry;
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('surfaces B failure even when SWR retains the successful A outcome', async () => {
    const { result, rerender } = mount();
    await waitFor(() => expect(result.current.status).toBe('ready'));
    mocks.query.mockRejectedValue(new TypeError('B connection lost'));
    rerender({ id: 'B', eventKey: 'event-a' });
    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: 'error',
        source: 'query',
        error: { message: 'B connection lost' }
      })
    );
    expect(result.current).not.toHaveProperty('data');
  });

  it('loads prerequisites before querying and recovers after roster arrival', async () => {
    mocks.teams.mockReturnValue({ data: undefined, mutate: vi.fn() });
    const { result, rerender } = mount();
    expect(result.current).toMatchObject({
      status: 'loading',
      source: 'teams'
    });
    expect(mocks.query).not.toHaveBeenCalled();
    mocks.teams.mockReturnValue({ data: [], mutate: vi.fn() });
    rerender({ id: 'A', eventKey: 'event-a' });
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it.each(['catalogue', 'teams', 'matches'] as const)(
    'preserves %s errors and retries the source',
    async (source) => {
      const mutate = vi.fn().mockResolvedValue([]);
      mocks[source].mockReturnValue({
        error: new SyntaxError('Bad JSON'),
        mutate
      });
      const { result, rerender } = mount();
      expect(result.current).toMatchObject({
        status: 'error',
        source,
        error: { kind: 'validation', message: 'Bad JSON' }
      });
      expect(mocks.query).not.toHaveBeenCalled();
      await act(async () => {
        await result.current.retry();
      });
      expect(mutate).toHaveBeenCalledOnce();
      mocks[source].mockReturnValue({ data: [], mutate });
      rerender({ id: 'A', eventKey: 'event-a' });
      await waitFor(() => expect(result.current.status).toBe('ready'));
    }
  );

  it.each([
    [new TypeError('Failed to fetch'), 'error', 'query', 'network'],
    [new SyntaxError('Bad JSON'), 'error', 'query', 'validation'],
    [
      Object.assign(new Error('Server failed'), { status: 500 }),
      'error',
      'query',
      'http'
    ],
    [
      Object.assign(new Error('Stats service offline'), { status: 503 }),
      'unavailable',
      'query',
      undefined
    ],
    [
      new LoadError('adaptation', 'adaptation', 'Wrong semantic shape'),
      'error',
      'adaptation',
      'adaptation'
    ]
  ])(
    'reports query failure and recovers on retry: %s',
    async (cause, status, source, kind) => {
      mocks.query.mockRejectedValueOnce(cause).mockResolvedValue(outcome('A'));
      const { result } = mount();
      await waitFor(() => expect(result.current.status).toBe(status));
      expect(result.current.source).toBe(source);
      if (result.current.status === 'error')
        expect(result.current.error.kind).toBe(kind);
      await act(async () => {
        await result.current.retry();
      });
      await waitFor(() => expect(result.current.status).toBe('ready'));
    }
  );

  it.each(['not_found', 'insufficient_data', 'unavailable'] as const)(
    'preserves normal %s outcomes',
    async (status) => {
      mocks.query.mockResolvedValue({
        ok: false,
        unavailable: {
          spec: spec('A'),
          status,
          reason: 'No source data',
          warnings: []
        }
      });
      const { result } = mount();
      await waitFor(() =>
        expect(result.current).toMatchObject({
          status: 'unavailable',
          code: status,
          reason: 'No source data'
        })
      );
    }
  );

  it('keeps valid empty frames ready and clears at the end of the order', async () => {
    mocks.query.mockResolvedValue(outcome('A', true));
    const { result, rerender } = mount();
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current).toMatchObject({
      status: 'ready',
      data: { frame: { emptyReason: 'No eligible matches' } }
    });
    rerender({ id: null, eventKey: 'event-a' });
    expect(result.current).toMatchObject({ status: 'ready', data: null });
  });

  it('retains A while B calculates, rejects a late B response after C, and binds the requested identity', async () => {
    const b = deferred<GraphicFrameOutcome>();
    const c = deferred<GraphicFrameOutcome>();
    const { result, rerender } = mount();
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const identityA = result.current.requestedIdentity;
    mocks.query.mockImplementation((_key, requested) =>
      requested.id === 'B' ? b.promise : c.promise
    );
    rerender({ id: 'B', eventKey: 'event-a' });
    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(2));
    expect(result.current).toMatchObject({
      status: 'loading',
      previous: { spec: { id: 'A' } }
    });
    expect(result.current.requestedIdentity).not.toBe(identityA);
    rerender({ id: 'C', eventKey: 'event-a' });
    await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(3));
    await act(async () => {
      c.resolve(outcome('C'));
    });
    await waitFor(() =>
      expect(result.current).toMatchObject({
        status: 'ready',
        data: { spec: { id: 'C' } }
      })
    );
    await act(async () => {
      b.resolve(outcome('B'));
    });
    expect(result.current).toMatchObject({
      status: 'ready',
      data: { spec: { id: 'C' } }
    });
  });

  it('never retains a different event frame', async () => {
    const pending = deferred<GraphicFrameOutcome>();
    const { result, rerender } = mount();
    await waitFor(() => expect(result.current.status).toBe('ready'));
    mocks.query.mockReturnValue(pending.promise);
    rerender({ id: 'A', eventKey: 'event-b' });
    expect(result.current).toMatchObject({
      status: 'loading',
      previous: undefined
    });
    await act(async () => {
      pending.resolve(outcome('A'));
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mocks.query.mock.calls.at(-1)?.[0]).toBe('event-b');
  });

  it.each([
    ['teams', [{ teamKey: 1, teamNumber: '1', teamNameShort: 'Renamed' }]],
    ['teams', [{ teamKey: 2, teamNumber: '2', teamNameShort: 'Replacement' }]],
    [
      'matches',
      [
        {
          id: 1,
          tournamentKey: 'q',
          name: 'Renamed match',
          participants: [{ teamKey: 1, station: 11 }]
        }
      ]
    ],
    [
      'matches',
      [
        {
          id: 1,
          tournamentKey: 'q',
          name: 'Match 1',
          participants: [{ teamKey: 1, station: 21 }]
        }
      ]
    ]
  ] as const)(
    'invalidates same-count %s content edits',
    async (source, data) => {
      const { result, rerender } = mount();
      await waitFor(() => expect(result.current.status).toBe('ready'));
      const before = result.current.requestedIdentity;
      mocks[source].mockReturnValue({ data, mutate: vi.fn() });
      rerender({ id: 'A', eventKey: 'event-a' });
      await waitFor(() => expect(mocks.query).toHaveBeenCalledTimes(2));
      expect(result.current.requestedIdentity).not.toBe(before);
    }
  );

  it('canonicalizes object fields and ignores unconsumed roster fields', () => {
    expect(stableIdentity({ a: 1, b: 2 })).toBe(stableIdentity({ b: 2, a: 1 }));
    expect(
      rosterIdentity({ teams: [{ teamKey: 1, teamNumber: '1' }], matches: [] })
    ).toBe(
      rosterIdentity({ teams: [{ teamNumber: '1', teamKey: 1 }], matches: [] })
    );
  });
});
