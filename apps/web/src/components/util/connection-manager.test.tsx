import { GraphicsSocketEvent } from '@toa-lib/models';
import { waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createWorkerMock } from '../../test/mock-worker.js';
import { renderWithJotai } from '../../test/render-with-jotai.js';
import { eventKeyAtom } from '../../stores/state/event.js';
import {
  playbackDeliveryMapAtom
} from '../../stores/state/graphics.js';
import { ConnectionManager } from './connection-manager.js';

const mocks = vi.hoisted(() => ({
  useSocketWorker: vi.fn(),
  handler: vi.fn()
}));

vi.mock('comlink', () => ({ proxy: <T,>(value: T) => value }));
vi.mock('src/api/use-socket-worker.js', () => ({
  useSocketWorker: mocks.useSocketWorker
}));
vi.mock('src/api/events/index.js', () => ({
  useCommitEvent: () => mocks.handler,
  useDisplayEvent: () => mocks.handler,
  useGraphicsPreviewReplayEvent: () => mocks.handler,
  usePlaybackStateEvent: () => mocks.handler,
  useMatchStateEvents: () => ({
    handleMatchAbort: mocks.handler,
    handleMatchEnd: mocks.handler,
    handleMatchEndgame: mocks.handler,
    handleMatchPrestart: mocks.handler,
    handleMatchStart: mocks.handler,
    handleMatchTeleop: mocks.handler
  }),
  useMatchUpdateEvent: () => mocks.handler,
  usePrestartEvent: () => mocks.handler
}));

describe('ConnectionManager graphics subscription', () => {
  it('installs authoritative listeners before subscribe and marks hydration', async () => {
    const worker = createWorkerMock();
    mocks.useSocketWorker.mockReturnValue({ worker, connected: false });
    const view = renderWithJotai(<ConnectionManager />, (store) => {
      store.set(eventKeyAtom, 'event');
    });

    expect(view.store.get(playbackDeliveryMapAtom).event?.phase).toBe('disconnected');
    mocks.useSocketWorker.mockReturnValue({ worker, connected: true });
    view.rerender(<ConnectionManager />);

    await waitFor(() =>
      expect(view.store.get(playbackDeliveryMapAtom).event?.phase).toBe('hydrating')
    );
    const stateListenerCall = worker.on.mock.calls.findIndex(
      ([event]) => event === GraphicsSocketEvent.PLAYBACK_STATE_V1
    );
    const subscribeCall = worker.emit.mock.calls.findIndex(
      ([event]) => event === 'graphics:subscribe'
    );
    expect(stateListenerCall).toBeGreaterThanOrEqual(0);
    expect(subscribeCall).toBeGreaterThanOrEqual(0);
    expect(worker.on.mock.invocationCallOrder[stateListenerCall]).toBeLessThan(
      worker.emit.mock.invocationCallOrder[subscribeCall]
    );
  });
});
