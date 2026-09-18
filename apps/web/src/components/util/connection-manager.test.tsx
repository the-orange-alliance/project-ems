import {
  GraphicsSocketEvent,
  createEmptyPlaybackState,
  createPlaybackStateEnvelope,
  type PlaybackStateEnvelope
} from '@toa-lib/models';
import { act, waitFor } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance
} from 'vitest';
import { createWorkerMock } from '../../test/mock-worker.js';
import { renderWithJotai } from '../../test/render-with-jotai.js';
import { eventKeyAtom } from '../../stores/state/event.js';
import {
  playbackDeliveryMapAtom,
  playbackEventStoreAtom
} from '../../stores/state/graphics.js';
import { resetPlaybackHydrationRecovery } from 'src/api/playback-hydration-recovery.js';
// Spied rather than `vi.mock`ed: this workspace runs its suite in one shared
// VM (`pool: 'vmThreads'`), where two files mocking the same module id hand
// each other their mocks.
import { graphicsApi } from 'src/api/use-graphics-data.js';
import {
  ConnectionManager,
  HYDRATION_TIMEOUT_MS,
  HYDRATION_TIMEOUT_REASON
} from './connection-manager.js';

const hoisted = vi.hoisted(() => ({
  useSocketWorker: vi.fn(),
  handler: vi.fn()
}));
type AuthoritativeStateSpy = MockInstance<
  typeof graphicsApi.live.authoritativeState
>;
const mocks = {
  ...hoisted,
  authoritativeState: null as unknown as AuthoritativeStateSpy
};

vi.mock('comlink', () => ({ proxy: <T,>(value: T) => value }));
vi.mock('src/api/use-socket-worker.js', () => ({
  useSocketWorker: hoisted.useSocketWorker
}));
vi.mock('src/api/events/index.js', () => ({
  useCommitEvent: () => hoisted.handler,
  useDisplayEvent: () => hoisted.handler,
  useGraphicsPreviewReplayEvent: () => hoisted.handler,
  usePlaybackHydrationErrorEvent: () => hoisted.handler,
  usePlaybackStateEvent: () => hoisted.handler,
  useMatchStateEvents: () => ({
    handleMatchAbort: hoisted.handler,
    handleMatchEnd: hoisted.handler,
    handleMatchEndgame: hoisted.handler,
    handleMatchPrestart: hoisted.handler,
    handleMatchStart: hoisted.handler,
    handleMatchTeleop: mocks.handler
  }),
  useMatchUpdateEvent: () => hoisted.handler,
  usePrestartEvent: () => hoisted.handler
}));

const AT = '2026-01-01T00:00:00.000Z';
const envelope = (
  eventKey: string,
  epoch: string,
  revision: number
): PlaybackStateEnvelope =>
  createPlaybackStateEnvelope(epoch, {
    ...createEmptyPlaybackState(eventKey, AT),
    revision
  });

beforeEach(() => {
  vi.clearAllMocks();
  resetPlaybackHydrationRecovery();
  mocks.authoritativeState = vi.spyOn(graphicsApi.live, 'authoritativeState');
  // Fails fast by default, so a test that does not care about recovery
  // cannot accidentally hydrate through the fallback - and, under this
  // workspace's shared-VM pool, leaves no promise pending past the file.
  mocks.authoritativeState.mockRejectedValue(
    new Error('no authoritative fallback in this test')
  );
});
afterEach(() => {
  vi.useRealTimers();
});

describe('ConnectionManager graphics subscription', () => {
  it('installs authoritative listeners before subscribe and marks hydration', async () => {
    const worker = createWorkerMock();
    hoisted.useSocketWorker.mockReturnValue({ worker, connected: false });
    const view = renderWithJotai(<ConnectionManager />, (store) => {
      store.set(eventKeyAtom, 'event');
    });

    expect(view.store.get(playbackDeliveryMapAtom).event?.phase).toBe(
      'disconnected'
    );
    hoisted.useSocketWorker.mockReturnValue({ worker, connected: true });
    view.rerender(<ConnectionManager />);

    await waitFor(() =>
      expect(view.store.get(playbackDeliveryMapAtom).event?.phase).toBe(
        'hydrating'
      )
    );
    const stateListenerCall = worker.on.mock.calls.findIndex(
      ([event]) => event === GraphicsSocketEvent.PLAYBACK_STATE_V1
    );
    const errorListenerCall = worker.on.mock.calls.findIndex(
      ([event]) => event === GraphicsSocketEvent.PLAYBACK_HYDRATION_ERROR_V1
    );
    const subscribeCall = worker.emit.mock.calls.findIndex(
      ([event]) => event === 'graphics:subscribe'
    );
    expect(stateListenerCall).toBeGreaterThanOrEqual(0);
    expect(errorListenerCall).toBeGreaterThanOrEqual(0);
    expect(subscribeCall).toBeGreaterThanOrEqual(0);
    expect(worker.on.mock.invocationCallOrder[stateListenerCall]).toBeLessThan(
      worker.emit.mock.invocationCallOrder[subscribeCall]
    );
    // The failure signal must be listening before the subscribe too, or a
    // relay that fails its read immediately would report into the void.
    expect(worker.on.mock.invocationCallOrder[errorListenerCall]).toBeLessThan(
      worker.emit.mock.invocationCallOrder[subscribeCall]
    );
  });

  it('removes the hydration failure listener on teardown', async () => {
    const worker = createWorkerMock();
    hoisted.useSocketWorker.mockReturnValue({ worker, connected: true });
    const view = renderWithJotai(<ConnectionManager />, (store) => {
      store.set(eventKeyAtom, 'event');
    });
    await waitFor(() =>
      expect(view.store.get(playbackDeliveryMapAtom).event?.phase).toBe(
        'hydrating'
      )
    );

    view.unmount();

    expect(
      worker.off.mock.calls.some(
        ([event]) => event === GraphicsSocketEvent.PLAYBACK_HYDRATION_ERROR_V1
      )
    ).toBe(true);
  });
});

describe('ConnectionManager hydration recovery', () => {
  /**
   * The original wedge: a replay whose API read failed emitted nothing, and
   * the browser sat in `{ phase: 'hydrating', error: null }` forever with
   * every transport control disabled and no action available. Recovery was a
   * page reload.
   */
  it('calls a hydration that never completes a failure instead of hydrating forever', async () => {
    vi.useFakeTimers();
    const worker = createWorkerMock();
    hoisted.useSocketWorker.mockReturnValue({ worker, connected: true });
    const view = renderWithJotai(<ConnectionManager />, (store) => {
      store.set(eventKeyAtom, 'event-a');
    });
    expect(view.store.get(playbackDeliveryMapAtom)['event-a'].phase).toBe(
      'hydrating'
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(HYDRATION_TIMEOUT_MS + 1);
    });

    const delivery = view.store.get(playbackDeliveryMapAtom)['event-a'];
    // `recovering` because the automatic fallback read starts immediately;
    // either way it has left the `hydrating` limbo and carries a reason.
    expect(['failed', 'recovering']).toContain(delivery.phase);
    expect(delivery.error).toBe(HYDRATION_TIMEOUT_REASON);
  });

  it('recovers a failed hydration on its own with the authoritative fallback read', async () => {
    const recovered = envelope('event-a', 'epoch-a', 4);
    mocks.authoritativeState.mockResolvedValue(recovered);
    const worker = createWorkerMock();
    hoisted.useSocketWorker.mockReturnValue({ worker, connected: true });
    const view = renderWithJotai(<ConnectionManager />, (store) => {
      store.set(eventKeyAtom, 'event-a');
    });

    await waitFor(() =>
      expect(view.store.get(playbackDeliveryMapAtom)['event-a']?.phase).toBe(
        'hydrating'
      )
    );
    // Stand in for the relay's failure signal.
    act(() => {
      view.store.set(playbackDeliveryMapAtom, {
        'event-a': {
          phase: 'failed',
          error: 'The graphics API is not reachable.'
        }
      });
    });

    await waitFor(() =>
      expect(view.store.get(playbackDeliveryMapAtom)['event-a']).toEqual({
        phase: 'ready',
        error: null
      })
    );
    expect(view.store.get(playbackEventStoreAtom)['event-a'].envelope).toEqual(
      recovered
    );
  });

  it('leaves no retry timer running after unmount', async () => {
    vi.useFakeTimers();
    mocks.authoritativeState.mockRejectedValue(new Error('unreachable'));
    const worker = createWorkerMock();
    hoisted.useSocketWorker.mockReturnValue({ worker, connected: true });
    const view = renderWithJotai(<ConnectionManager />, (store) => {
      store.set(eventKeyAtom, 'event-a');
    });

    // Drive it into recovery: backstop fires, the first read rejects, and the
    // second attempt is sitting on its backoff timer.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HYDRATION_TIMEOUT_MS + 1);
    });
    // Each 1ms tick also drains microtasks, so a couple of them is enough
    // for the rejected read to schedule the next attempt's backoff.
    for (let tick = 0; tick < 5 && vi.getTimerCount() === 0; tick++)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
    expect(mocks.authoritativeState).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    await act(async () => {
      view.unmount();
      await Promise.resolve();
    });

    // Both the hydration backstop and the recovery backoff are scoped to the
    // subscription; nothing may outlive it.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('leaves no hydration backstop timer running after a disconnect', async () => {
    const worker = createWorkerMock();
    hoisted.useSocketWorker.mockReturnValue({ worker, connected: true });
    const view = renderWithJotai(<ConnectionManager />, (store) => {
      store.set(eventKeyAtom, 'event-a');
    });
    await waitFor(() =>
      expect(view.store.get(playbackDeliveryMapAtom)['event-a']?.phase).toBe(
        'hydrating'
      )
    );

    vi.useFakeTimers();
    hoisted.useSocketWorker.mockReturnValue({ worker, connected: false });
    await act(async () => {
      view.rerender(<ConnectionManager />);
    });

    expect(view.store.get(playbackDeliveryMapAtom)['event-a'].phase).toBe(
      'disconnected'
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it('leaves no timer from the previous event after switching events', async () => {
    const worker = createWorkerMock();
    hoisted.useSocketWorker.mockReturnValue({ worker, connected: true });
    const view = renderWithJotai(<ConnectionManager />, (store) => {
      store.set(eventKeyAtom, 'event-a');
    });
    await waitFor(() =>
      expect(view.store.get(playbackDeliveryMapAtom)['event-a']?.phase).toBe(
        'hydrating'
      )
    );

    vi.useFakeTimers();
    await act(async () => {
      view.store.set(eventKeyAtom, 'event-b');
    });
    // event-b's own backstop is the only timer standing; event-a's is gone,
    // so advancing past the timeout must never mark event-a failed.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(HYDRATION_TIMEOUT_MS + 1);
    });

    expect(view.store.get(playbackDeliveryMapAtom)['event-a'].phase).toBe(
      'hydrating'
    );
  });

  it('marks delivery disconnected without touching the stored envelope', async () => {
    const worker = createWorkerMock();
    hoisted.useSocketWorker.mockReturnValue({ worker, connected: true });
    const existing = envelope('event-a', 'epoch-a', 2);
    const view = renderWithJotai(<ConnectionManager />, (store) => {
      store.set(eventKeyAtom, 'event-a');
      store.set(playbackEventStoreAtom, {
        'event-a': { envelope: existing, retiredAuthorityEpochs: [] }
      });
    });
    await waitFor(() =>
      expect(view.store.get(playbackDeliveryMapAtom)['event-a']?.phase).toBe(
        'hydrating'
      )
    );

    hoisted.useSocketWorker.mockReturnValue({ worker, connected: false });
    await act(async () => {
      view.rerender(<ConnectionManager />);
    });

    expect(view.store.get(playbackDeliveryMapAtom)['event-a']).toEqual({
      phase: 'disconnected',
      error: null
    });
    expect(view.store.get(playbackEventStoreAtom)['event-a'].envelope).toEqual(
      existing
    );
  });
});
