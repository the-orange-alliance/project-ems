import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithJotai } from '../../test/render-with-jotai.js';
import {
  playbackDeliveryMapAtom,
  playbackEventStoreAtom,
  type PlaybackDeliveryState
} from '../../stores/state/graphics.js';
import { usePlaybackHydrationErrorEvent } from './playback-hydration-error-event.js';

const failure = (overrides: Record<string, unknown> = {}) => ({
  eventKey: 'event-a',
  code: 'HTTP_502',
  message: 'The graphics API is not reachable.',
  retryable: true,
  ...overrides
});

function harness(initial?: PlaybackDeliveryState) {
  let receive: ReturnType<typeof usePlaybackHydrationErrorEvent> | undefined;
  const Harness = () => {
    receive = usePlaybackHydrationErrorEvent();
    return null;
  };
  const view = renderWithJotai(<Harness />, (store) => {
    if (initial) store.set(playbackDeliveryMapAtom, { 'event-a': initial });
  });
  return { view, send: (input: unknown) => receive?.(input) };
}

describe('playback hydration error socket handler', () => {
  it('ends a failed hydration in `failed` with the upstream reason, not a permanent `hydrating`', async () => {
    const { view, send } = harness({ phase: 'hydrating', error: null });

    await act(async () => {
      send(failure());
    });

    expect(view.store.get(playbackDeliveryMapAtom)['event-a']).toEqual({
      phase: 'failed',
      error: 'HTTP_502: The graphics API is not reachable.'
    });
  });

  it('carries the upstream code and message verbatim rather than a generic string', async () => {
    const { view, send } = harness({ phase: 'hydrating', error: null });

    await act(async () => {
      send(
        failure({
          code: 'HTTP_409',
          message: 'NOT_READY: No playback coordinator for this event yet',
          retryable: false
        })
      );
    });

    expect(view.store.get(playbackDeliveryMapAtom)['event-a'].error).toBe(
      'HTTP_409: NOT_READY: No playback coordinator for this event yet'
    );
  });

  it('never downgrades a delivery that already hydrated', async () => {
    const { view, send } = harness({ phase: 'ready', error: null });

    await act(async () => {
      send(failure());
    });

    // A late failure for an event a socket envelope already hydrated must
    // not disable a transport that is genuinely working.
    expect(view.store.get(playbackDeliveryMapAtom)['event-a']).toEqual({
      phase: 'ready',
      error: null
    });
  });

  it('is a diagnosis, never a state message - it touches no envelope', async () => {
    const { view, send } = harness({ phase: 'hydrating', error: null });

    await act(async () => {
      send(failure());
    });

    expect(view.store.get(playbackEventStoreAtom)).toEqual({});
  });

  it('ignores a payload that is not a valid hydration error', async () => {
    const { view, send } = harness({ phase: 'hydrating', error: null });

    await act(async () => {
      send({ eventKey: 'event-a' });
      send(null);
      send({ eventKey: 'event-a', message: 'no retryable flag' });
    });

    expect(view.store.get(playbackDeliveryMapAtom)['event-a']).toEqual({
      phase: 'hydrating',
      error: null
    });
  });
});
