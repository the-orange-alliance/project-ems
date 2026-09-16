import {
  createEmptyPlaybackState,
  createPlaybackStateEnvelope,
  type PlaybackStateEnvelope
} from '@toa-lib/models';
import { act } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance
} from 'vitest';
import { graphicsApi } from 'src/api/use-graphics-data.js';
import { renderWithJotai } from '../test/render-with-jotai.js';
import {
  playbackDeliveryMapAtom,
  playbackEventStoreAtom
} from '../stores/state/graphics.js';
import { usePlaybackStateEvent } from './events/playback-state-event.js';
import {
  HYDRATION_RECOVERY_BACKOFF_MS,
  resetPlaybackHydrationRecovery,
  usePlaybackHydrationRecovery
} from 'src/api/playback-hydration-recovery.js';

// Spied rather than `vi.mock`ed on purpose: this workspace runs its suite in
// one shared VM (`pool: 'vmThreads'`), where two files mocking the same module
// id hand each other their mocks. A spy is scoped to this file's tests and is
// restored automatically (`restoreMocks`).
type AuthoritativeStateSpy = MockInstance<
  typeof graphicsApi.live.authoritativeState
>;
const mocks = { authoritativeState: null as unknown as AuthoritativeStateSpy };

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

function harness(initialize?: Parameters<typeof renderWithJotai>[1]) {
  let recoverRef: ReturnType<typeof usePlaybackHydrationRecovery>['recover'];
  let deliverRef: ReturnType<typeof usePlaybackStateEvent>;
  const Harness = () => {
    recoverRef = usePlaybackHydrationRecovery().recover;
    deliverRef = usePlaybackStateEvent();
    return null;
  };
  const view = renderWithJotai(<Harness />, initialize);
  return {
    view,
    recover: (
      eventKey: string,
      options?: { attempts?: number; signal?: AbortSignal }
    ) => recoverRef(eventKey, options),
    deliverSocket: (input: unknown) => deliverRef(input)
  };
}

const failedDelivery =
  (eventKey: string) => (store: { set: (atom: never, value: never) => void }) =>
    (
      store as unknown as {
        set: (a: typeof playbackDeliveryMapAtom, v: unknown) => void;
      }
    ).set(playbackDeliveryMapAtom, {
      [eventKey]: {
        phase: 'failed',
        error: 'The graphics API is not reachable.'
      }
    });

describe('playback hydration recovery', () => {
  beforeEach(() => {
    resetPlaybackHydrationRecovery();
    mocks.authoritativeState = vi.spyOn(graphicsApi.live, 'authoritativeState');
  });
  // Fake timers must never leak into the next test, even from a failure.
  afterEach(() => {
    vi.useRealTimers();
  });

  it('recovers delivery to ready and stores the envelope the fallback read returned', async () => {
    const recovered = envelope('event-a', 'epoch-a', 7);
    mocks.authoritativeState.mockResolvedValue(recovered);
    const h = harness(failedDelivery('event-a'));

    await act(async () => {
      await expect(h.recover('event-a', { attempts: 1 })).resolves.toBe(true);
    });

    expect(mocks.authoritativeState).toHaveBeenCalledWith('event-a');
    expect(h.view.store.get(playbackDeliveryMapAtom)['event-a']).toEqual({
      phase: 'ready',
      error: null
    });
    expect(
      h.view.store.get(playbackEventStoreAtom)['event-a'].envelope
    ).toEqual(recovered);
  });

  it('leaves a newer socket envelope in place when a fallback read is still in flight', async () => {
    // The fallback is a READ of the same authority, not a second authority:
    // it must lose to anything newer that arrived while it was out.
    let resolveRead: (value: PlaybackStateEnvelope) => void = () => {};
    mocks.authoritativeState.mockReturnValue(
      new Promise<PlaybackStateEnvelope>((resolve) => {
        resolveRead = resolve;
      })
    );
    const h = harness(failedDelivery('event-a'));

    let pending: Promise<boolean> | undefined;
    await act(async () => {
      pending = h.recover('event-a', { attempts: 1 });
      await Promise.resolve();
    });

    // The socket wins the race at revision N+1 ...
    await act(async () => {
      h.deliverSocket(envelope('event-a', 'epoch-a', 6));
    });
    // ... and the in-flight read comes back at revision N.
    await act(async () => {
      resolveRead(envelope('event-a', 'epoch-a', 5));
      await pending;
    });

    expect(
      h.view.store.get(playbackEventStoreAtom)['event-a'].envelope.state
        .revision
    ).toBe(6);
    expect(h.view.store.get(playbackDeliveryMapAtom)['event-a']).toEqual({
      phase: 'ready',
      error: null
    });
  });

  it('is inert when the fallback answers from a retired authority epoch', async () => {
    mocks.authoritativeState.mockResolvedValue(
      envelope('event-a', 'epoch-retired', 99)
    );
    const current = envelope('event-a', 'epoch-current', 2);
    const h = harness((store) => {
      store.set(playbackEventStoreAtom, {
        'event-a': {
          envelope: current,
          retiredAuthorityEpochs: ['epoch-retired']
        }
      });
      store.set(playbackDeliveryMapAtom, {
        'event-a': { phase: 'failed', error: 'unreachable' }
      });
    });

    await act(async () => {
      await expect(h.recover('event-a', { attempts: 1 })).resolves.toBe(false);
    });

    // A delayed message from a retired epoch stays inert even at a much
    // higher revision - exactly as it would over the socket.
    expect(h.view.store.get(playbackEventStoreAtom)['event-a']).toEqual({
      envelope: current,
      retiredAuthorityEpochs: ['epoch-retired']
    });
  });

  it('discards a response for a different event than the one being recovered', async () => {
    const eventB = envelope('event-b', 'epoch-b', 4);
    mocks.authoritativeState.mockResolvedValue(
      envelope('event-a', 'epoch-a', 9)
    );
    const h = harness((store) => {
      store.set(playbackEventStoreAtom, {
        'event-b': { envelope: eventB, retiredAuthorityEpochs: [] }
      });
      store.set(playbackDeliveryMapAtom, {
        'event-a': { phase: 'failed', error: 'unreachable' },
        'event-b': { phase: 'ready', error: null }
      });
    });

    await act(async () => {
      await h.recover('event-a', { attempts: 1 });
    });

    // Event isolation: recovering A writes only A.
    expect(h.view.store.get(playbackEventStoreAtom)['event-b']).toEqual({
      envelope: eventB,
      retiredAuthorityEpochs: []
    });
    expect(h.view.store.get(playbackDeliveryMapAtom)['event-b']).toEqual({
      phase: 'ready',
      error: null
    });
  });

  it('discards a response whose event key is not the one that was asked for', async () => {
    const eventB = envelope('event-b', 'epoch-b', 4);
    mocks.authoritativeState.mockResolvedValue(eventB);
    const h = harness((store) => {
      store.set(playbackDeliveryMapAtom, {
        'event-a': { phase: 'failed', error: 'unreachable' },
        'event-b': { phase: 'ready', error: null }
      });
    });

    await act(async () => {
      await expect(h.recover('event-a', { attempts: 1 })).resolves.toBe(false);
    });

    expect(h.view.store.get(playbackEventStoreAtom)).toEqual({});
    expect(
      h.view.store.get(playbackDeliveryMapAtom)['event-a'].error
    ).toContain('event-b');
  });

  it('bounds its attempts and ends in failed carrying the last upstream reason', async () => {
    vi.useFakeTimers();
    mocks.authoritativeState.mockRejectedValue(
      new Error('HttpError 503 Authoritative playback state is unavailable')
    );
    const h = harness(failedDelivery('event-a'));

    let pending: Promise<boolean> | undefined;
    await act(async () => {
      pending = h.recover('event-a');
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
      await pending;
    });

    expect(mocks.authoritativeState).toHaveBeenCalledTimes(
      HYDRATION_RECOVERY_BACKOFF_MS.length
    );
    expect(h.view.store.get(playbackDeliveryMapAtom)['event-a']).toEqual({
      phase: 'failed',
      error: 'HttpError 503 Authoritative playback state is unavailable'
    });
    // Nothing is left ticking once the bounded attempts are spent.
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it('is single-flight per event: two overlapping recoveries issue one read', async () => {
    mocks.authoritativeState.mockResolvedValue(
      envelope('event-a', 'epoch-a', 3)
    );
    const h = harness(failedDelivery('event-a'));

    await act(async () => {
      const first = h.recover('event-a', { attempts: 1 });
      const second = h.recover('event-a', { attempts: 1 });
      expect(second).toBe(first);
      await Promise.all([first, second]);
    });

    expect(mocks.authoritativeState).toHaveBeenCalledTimes(1);
  });

  it('abandons an aborted recovery without writing anything', async () => {
    vi.useFakeTimers();
    mocks.authoritativeState.mockResolvedValue(
      envelope('event-a', 'epoch-a', 3)
    );
    const h = harness(failedDelivery('event-a'));
    const controller = new AbortController();

    let pending: Promise<boolean> | undefined;
    await act(async () => {
      controller.abort();
      pending = h.recover('event-a', { signal: controller.signal });
      await vi.advanceTimersByTimeAsync(60_000);
      await expect(pending).resolves.toBe(false);
    });

    expect(mocks.authoritativeState).not.toHaveBeenCalled();
    expect(h.view.store.get(playbackEventStoreAtom)).toEqual({});
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });
});
