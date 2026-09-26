import type { PlaybackDeliveryHealth } from '@toa-lib/models';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getPlaybackDelivery,
  resetPlaybackDelivery
} from './playback-delivery.js';
import { graphicsApi } from './use-graphics-data.js';

// The real HTTP client and real response schemas: only the network is faked,
// so an acknowledgment that does not validate cannot pass here.
const NOW = '2026-09-16T12:00:00.000Z';

const failing: PlaybackDeliveryHealth = {
  eventKey: 'event-a',
  status: 'failing',
  configured: true,
  pendingRevision: 8,
  attempts: 1,
  nextRetryAtUtc: '2026-09-16T12:00:01.000Z',
  lastDeliveredRevision: 6,
  lastDeliveredAtUtc: null,
  error: 'failed',
  failure: {
    reason: 'realtime-unreachable',
    revision: 7,
    attempts: 1,
    retryable: true,
    parkedAtUtc: null,
    message: 'Realtime could not be reached for event "event-a" revision 7.',
    action: 'Check that realtime is running.'
  }
};

const ack = (requestId: string) => ({
  ok: true,
  requestId,
  replayed: false,
  state: {
    schemaVersion: 2,
    eventKey: 'event-a',
    revision: 8,
    loaded: null,
    cue: { status: 'empty' },
    program: null,
    stagedUpdate: { status: 'empty' },
    transition: null,
    lastCommandId: requestId,
    updatedAtUtc: NOW
  },
  delivery: failing
});

const requests: { method: string; url: string }[] = [];
function respondWith(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({
        method: (init?.method ?? 'GET').toUpperCase(),
        url: String(input)
      });
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    })
  );
}

describe('playback command acknowledgments feed delivery health', () => {
  beforeEach(() => {
    resetPlaybackDelivery();
    requests.length = 0;
  });
  afterEach(() => vi.unstubAllGlobals());

  it('records the delivery carried by a command acknowledgment', async () => {
    respondWith(ack('r1'));
    await graphicsApi.live.take('event-a');
    expect(getPlaybackDelivery('event-a')).toEqual(failing);
  });

  it('records the delivery carried inside a show-advance result', async () => {
    respondWith({
      outcome: 'loaded-and-taken',
      consumedEntryId: 'entry-1',
      acknowledgment: ack('r2'),
      show: {
        schemaVersion: 2,
        revision: 3,
        rundownId: 'producer-show',
        eventKey: 'event-a',
        name: 'Show',
        entries: [],
        updatedAtUtc: NOW
      }
    });
    await graphicsApi.show.advance('event-a', { requestId: 'r2', take: true });
    expect(getPlaybackDelivery('event-a')).toEqual(failing);
  });

  it('explicit check and retry are single requests that record their answer', async () => {
    respondWith(failing);
    await graphicsApi.live.publicationHealth('event-a');
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain('/graphics/event-a/live/publication-health');

    const delivered = { ...failing, status: 'delivered', failure: null };
    respondWith(delivered);
    await graphicsApi.live.retryPublication('event-a');
    expect(requests).toHaveLength(2);
    expect(requests[1]).toMatchObject({ method: 'POST' });
    expect(requests[1].url).toContain('/graphics/event-a/live/publication-retry');
    expect(getPlaybackDelivery('event-a')).toEqual(delivered);
  });
});
