import {
  createEmptyPlaybackState,
  createPlaybackStateEnvelope
} from '@toa-lib/models';
import { act } from '@testing-library/react';
import { useAtomValue } from 'jotai';
import { describe, expect, it } from 'vitest';
import { renderWithJotai } from '../../test/render-with-jotai.js';
import {
  playbackDeliveryMapAtom,
  playbackEventStoreAtom
} from '../../stores/state/graphics.js';
import { usePlaybackStateEvent } from './playback-state-event.js';

const AT = '2026-01-01T00:00:00.000Z';

describe('playback state socket handler', () => {
  it('validates and stores full snapshots by payload event key', async () => {
    let receive: ReturnType<typeof usePlaybackStateEvent> | undefined;
    const Harness = () => {
      receive = usePlaybackStateEvent();
      useAtomValue(playbackEventStoreAtom);
      return null;
    };
    const view = renderWithJotai(<Harness />);
    const message = (eventKey: string, epoch: string, revision: number) =>
      createPlaybackStateEnvelope(epoch, {
        ...createEmptyPlaybackState(eventKey, AT),
        revision
      });

    await act(async () => {
      await receive?.(message('event-a', 'epoch-a', 1));
      await receive?.(message('event-b', 'epoch-b', 3));
    });

    expect(
      view.store.get(playbackEventStoreAtom)['event-a'].envelope.state.revision
    ).toBe(1);
    expect(
      view.store.get(playbackEventStoreAtom)['event-b'].envelope.state.revision
    ).toBe(3);
    expect(view.store.get(playbackDeliveryMapAtom)['event-a']).toEqual({
      phase: 'ready',
      error: null
    });

    await act(async () => {
      await receive?.({
        ...message('event-a', 'epoch-a', 2),
        schemaVersion: 99
      });
    });
    expect(
      view.store.get(playbackEventStoreAtom)['event-a'].envelope.state.revision
    ).toBe(1);
    expect(view.store.get(playbackDeliveryMapAtom)['event-a'].error).toContain(
      'schemaVersion'
    );
    // 'event-a' had already hydrated, so it keeps a working transport and
    // merely exposes the error.
    expect(view.store.get(playbackDeliveryMapAtom)['event-a'].phase).toBe(
      'ready'
    );
  });

  it('treats an invalid first envelope as a failed hydration, not a permanent hydrating', async () => {
    let receive: ReturnType<typeof usePlaybackStateEvent> | undefined;
    const Harness = () => {
      receive = usePlaybackStateEvent();
      useAtomValue(playbackEventStoreAtom);
      return null;
    };
    const view = renderWithJotai(<Harness />, (store) => {
      store.set(playbackDeliveryMapAtom, {
        'event-a': { phase: 'hydrating', error: null }
      });
    });

    await act(async () => {
      await receive?.({
        ...createPlaybackStateEnvelope('epoch-a', {
          ...createEmptyPlaybackState('event-a', AT),
          revision: 1
        }),
        schemaVersion: 99
      });
    });

    const delivery = view.store.get(playbackDeliveryMapAtom)['event-a'];
    expect(delivery.phase).toBe('failed');
    expect(delivery.error).toContain('schemaVersion');
    // A diagnosis writes no state.
    expect(view.store.get(playbackEventStoreAtom)).toEqual({});
  });
});
