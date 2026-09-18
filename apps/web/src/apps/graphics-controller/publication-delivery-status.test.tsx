import type {
  PlaybackDeliveryHealth,
  PlaybackStateEnvelope
} from '@toa-lib/models';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  recordPlaybackDelivery,
  resetPlaybackDelivery
} from 'src/api/playback-delivery.js';
import { playbackEventStoreAtom } from '../../stores/state/graphics.js';
import { renderWithJotai } from '../../test/render-with-jotai.js';
import { PublicationDeliveryStatus } from './publication-delivery-status.js';

const mocks = vi.hoisted(() => ({
  publicationHealth: vi.fn(),
  retryPublication: vi.fn()
}));

vi.mock('src/api/use-graphics-data.js', () => ({
  graphicsApi: {
    live: {
      publicationHealth: mocks.publicationHealth,
      retryPublication: mocks.retryPublication
    }
  }
}));

function health(
  overrides: Partial<PlaybackDeliveryHealth> = {}
): PlaybackDeliveryHealth {
  return {
    eventKey: 'event-a',
    status: 'delivered',
    configured: true,
    pendingRevision: null,
    attempts: 0,
    nextRetryAtUtc: null,
    lastDeliveredRevision: 6,
    lastDeliveredAtUtc: '2026-09-16T12:00:00.000Z',
    error: null,
    failure: null,
    ...overrides
  };
}

const unreachable = health({
  status: 'parked',
  pendingRevision: 7,
  attempts: 8,
  lastDeliveredRevision: 6,
  error: 'PARKED',
  failure: {
    reason: 'realtime-unreachable',
    revision: 7,
    attempts: 8,
    retryable: true,
    parkedAtUtc: '2026-09-16T12:00:36.000Z',
    message:
      'Realtime at http://127.0.0.1:8081/internal/graphics/playback could not be reached for playback publication of event "event-a" revision 7 (fetch failed: connect ECONNREFUSED).',
    action:
      'The API cannot reach the realtime service. Check that realtime is running. Then press Retry delivery.'
  }
});

/** The producer's own socket feed, holding `revision`. */
function socketAt(revision: number) {
  return (store: Parameters<Parameters<typeof renderWithJotai>[1] & {}>[0]) =>
    store.set(playbackEventStoreAtom, {
      'event-a': {
        envelope: {
          schemaVersion: 1,
          authorityEpoch: 'epoch-a',
          eventKey: 'event-a',
          state: { eventKey: 'event-a', revision }
        } as unknown as PlaybackStateEnvelope,
        retiredAuthorityEpochs: []
      }
    });
}

describe('PublicationDeliveryStatus', () => {
  beforeEach(() => {
    resetPlaybackDelivery();
    mocks.publicationHealth.mockReset();
    mocks.retryPublication.mockReset();
    // The explicit on-open read answers with whatever is already recorded.
    mocks.publicationHealth.mockImplementation(async () => null);
  });
  afterEach(() => vi.useRealTimers());

  it('renders a persistent, specific failure from the last acknowledgment', async () => {
    recordPlaybackDelivery(unreachable);
    renderWithJotai(<PublicationDeliveryStatus eventKey='event-a' />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('revision 7');
    expect(alert.textContent).toContain('event-a');
    expect(alert.textContent).toContain('8 attempts');
    expect(alert.textContent).toContain('ECONNREFUSED');
    expect(alert.textContent).toContain('Check that realtime is running');
    expect(alert.textContent).toMatch(/not showing/i);
  });

  it('names an oversized envelope with its size and the setting to change', async () => {
    recordPlaybackDelivery(
      health({
        status: 'parked',
        pendingRevision: 9,
        failure: {
          reason: 'too-large',
          revision: 9,
          attempts: 1,
          retryable: false,
          parkedAtUtc: '2026-09-16T12:00:00.000Z',
          message:
            'Playback publication for event "event-a" revision 9 is 5000000 bytes, which exceeds the configured realtime ingress limit of 4194304 bytes.',
          action: 'Raise GRAPHICS_PUBLICATION_MAX_BYTES on BOTH services.'
        }
      })
    );
    renderWithJotai(<PublicationDeliveryStatus eventKey='event-a' />);

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('5000000 bytes');
    expect(alert.textContent).toContain('GRAPHICS_PUBLICATION_MAX_BYTES');
    expect(alert.textContent).toMatch(/too large/i);
  });

  it('installs no timer and repeats no request - a 5 second poll fails this', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval'] });
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    recordPlaybackDelivery(
      health({ status: 'in-flight', pendingRevision: 7, lastDeliveredRevision: 6 })
    );
    renderWithJotai(<PublicationDeliveryStatus eventKey='event-a' />, socketAt(6));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    const afterOpen =
      mocks.publicationHealth.mock.calls.length +
      mocks.retryPublication.mock.calls.length;
    expect(afterOpen).toBeLessThanOrEqual(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });
    expect(
      mocks.publicationHealth.mock.calls.length +
        mocks.retryPublication.mock.calls.length
    ).toBe(afterOpen);
    expect(setIntervalSpy).not.toHaveBeenCalled();
    // Still visible: nothing but an answer from the server or the socket resolves it.
    expect(screen.getByRole('alert').textContent).toMatch(/revision 7/i);
  });

  it('an in-flight revision clears once the producer socket has received it', async () => {
    recordPlaybackDelivery(
      health({ status: 'in-flight', pendingRevision: 7, lastDeliveredRevision: 6 })
    );
    renderWithJotai(<PublicationDeliveryStatus eventKey='event-a' />, socketAt(7));
    await waitFor(() => expect(mocks.publicationHealth).toHaveBeenCalled());
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('Retry delivery recovers a parked publication and the indication clears', async () => {
    recordPlaybackDelivery(unreachable);
    mocks.retryPublication.mockImplementation(async (eventKey: string) => {
      const delivered = health({ eventKey, lastDeliveredRevision: 7 });
      recordPlaybackDelivery(delivered);
      return delivered;
    });
    renderWithJotai(<PublicationDeliveryStatus eventKey='event-a' />);

    fireEvent.click(await screen.findByRole('button', { name: /retry delivery/i }));

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(mocks.retryPublication).toHaveBeenCalledWith('event-a');
  });

  it('a failed retry request stays on screen with its reason', async () => {
    recordPlaybackDelivery(unreachable);
    mocks.retryPublication.mockRejectedValue(
      new Error('Status 503: Graphics playback is unavailable')
    );
    renderWithJotai(<PublicationDeliveryStatus eventKey='event-a' />);

    fireEvent.click(await screen.findByRole('button', { name: /retry delivery/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'Graphics playback is unavailable'
      )
    );
  });
});
