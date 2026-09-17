import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import {
  createGraphicsBroadcastReliabilityHarness,
  sampleGraphic
} from './graphics-broadcast-reliability-harness.js';
import { createRealtimePlaybackPublisher } from '../graphics/RealtimePlaybackPublisher.js';

/**
 * Delivery health travels WITH the command acknowledgment. The producer learns
 * whether a revision reached realtime as a consequence of issuing a command,
 * or by explicitly asking - never because something polled.
 *
 * Publication is fire-and-forget after the durable commit, so the ack for
 * command N may legitimately still show N as in flight. These tests pin down
 * that window explicitly and prove a failure is carried by the NEXT answer.
 */

type FetchMode =
  | { kind: 'unreachable' }
  | { kind: 'ok' }
  | { kind: 'retired-epoch' };

function realtimeFetch(mode: { current: FetchMode }) {
  return (async () => {
    const current = mode.current;
    if (current.kind === 'unreachable')
      throw new TypeError('fetch failed', {
        cause: Object.assign(
          new Error('connect ECONNREFUSED 127.0.0.1:8081'),
          { code: 'ECONNREFUSED' }
        )
      });
    const body =
      current.kind === 'retired-epoch'
        ? {
            accepted: false,
            reason: 'retired-epoch',
            authorityEpoch: 'api-epoch',
            eventKey: 'event-a',
            revision: 1
          }
        : { accepted: true, reason: 'broadcast' };
    return new Response(JSON.stringify(body), {
      status: current.kind === 'ok' ? 202 : 200,
      headers: { 'content-type': 'application/json' }
    });
  }) as typeof fetch;
}

async function harness(
  t: TestContext,
  mode: { current: FetchMode },
  maxBodyBytes?: number
) {
  const publisher = createRealtimePlaybackPublisher({
    token: 'test-token',
    authorityEpoch: 'api-epoch',
    fetch: realtimeFetch(mode),
    ...(maxBodyBytes ? { maxBodyBytes } : {})
  });
  return createGraphicsBroadcastReliabilityHarness(t, {
    publish: publisher.publish
  });
}

async function untilParked(
  coordinator: { publicationParked(eventKey: string): unknown },
  eventKey: string
) {
  const deadline = Date.now() + 3_000;
  while (!coordinator.publicationParked(eventKey)) {
    if (Date.now() > deadline)
      throw new Error(`Publication for ${eventKey} never parked.`);
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

test('a command acknowledgment carries delivery health; an unreachable realtime is named, parked, and recoverable headlessly', async (t) => {
  const mode = { current: { kind: 'unreachable' } as FetchMode };
  const { app, coordinator } = await harness(t, mode);

  const first = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/quick-take',
    payload: { spec: sampleGraphic('unreachable') }
  });
  assert.equal(first.statusCode, 200);
  const firstAck = first.json();
  const revision = firstAck.state.revision;
  // The ack for N is built before N's delivery can finish: it may say
  // in-flight or already failing, but it can never claim N was delivered.
  assert.ok(firstAck.delivery, 'the acknowledgment must carry delivery');
  assert.equal(firstAck.delivery.eventKey, 'event-a');
  assert.equal(firstAck.delivery.pendingRevision, revision);
  assert.notEqual(firstAck.delivery.status, 'delivered');

  await untilParked(coordinator, 'event-a');

  // Headless inspection returns the same structured shape.
  const health = (
    await app.inject('/graphics/event-a/live/publication-health')
  ).json();
  assert.equal(health.status, 'parked');
  assert.equal(health.failure.reason, 'realtime-unreachable');
  assert.equal(health.failure.revision, revision);
  assert.equal(health.failure.attempts, 8);
  assert.equal(health.failure.retryable, true);
  assert.match(health.failure.message, /event-a/);
  assert.match(health.failure.message, new RegExp(`revision ${revision}`));
  assert.match(health.failure.message, /ECONNREFUSED/);
  assert.match(health.failure.action, /realtime/i);
  assert.match(health.failure.action, /Retry delivery/);

  // The next command's ack carries the outstanding failure.
  const second = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/clear',
    payload: { requestId: 'after-unreachable' }
  });
  assert.equal(second.statusCode, 200);
  const secondAck = second.json();
  assert.ok(['failing', 'parked'].includes(secondAck.delivery.status));
  assert.equal(secondAck.delivery.failure.reason, 'realtime-unreachable');

  // Realtime comes back; an explicit API retry delivers and clears the failure.
  mode.current = { kind: 'ok' };
  const retried = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/publication-retry'
  });
  assert.equal(retried.statusCode, 200);
  assert.equal(retried.json().status, 'delivered');
  assert.equal(retried.json().failure, null);
  assert.equal(
    retried.json().lastDeliveredRevision,
    secondAck.state.revision
  );
  const after = (
    await app.inject('/graphics/event-a/live/publication-health')
  ).json();
  assert.equal(after.status, 'delivered');
  assert.equal(after.pendingRevision, null);
});

test('an oversized envelope is reported as too-large, not retryable, with the size and what to change', async (t) => {
  const mode = { current: { kind: 'ok' } as FetchMode };
  const { app, coordinator } = await harness(t, mode, 256);

  const first = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/quick-take',
    payload: { spec: sampleGraphic('too-large') }
  });
  assert.equal(first.statusCode, 200);
  const revision = first.json().state.revision;
  await untilParked(coordinator, 'event-a');

  const second = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/clear',
    payload: { requestId: 'after-too-large' }
  });
  const delivery = second.json().delivery;
  assert.ok(['failing', 'parked'].includes(delivery.status));
  assert.equal(delivery.failure.reason, 'too-large');
  assert.equal(delivery.failure.retryable, false);
  assert.match(delivery.failure.message, /bytes/);
  assert.match(delivery.failure.action, /GRAPHICS_PUBLICATION_MAX_BYTES/);

  const health = (
    await app.inject('/graphics/event-a/live/publication-health')
  ).json();
  assert.equal(health.status, 'parked');
  assert.equal(health.failure.attempts, 1);
  assert.ok(health.failure.revision >= revision);
});

test('a relay that answers retired-epoch is a named delivery failure, never a silent success', async (t) => {
  const mode = { current: { kind: 'retired-epoch' } as FetchMode };
  const { app, coordinator } = await harness(t, mode);

  const response = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/quick-take',
    payload: { spec: sampleGraphic('retired') }
  });
  assert.equal(response.statusCode, 200);
  await untilParked(coordinator, 'event-a');

  const health = (
    await app.inject('/graphics/event-a/live/publication-health')
  ).json();
  assert.equal(health.status, 'parked');
  assert.equal(health.lastDeliveredRevision, null);
  assert.equal(health.failure.reason, 'retired-epoch');
  assert.equal(health.failure.retryable, false);
  assert.match(health.failure.action, /another API/i);
});

test('the in-flight window is explicit: the ack says pending, and an explicit read resolves it', async (t) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  const { app } = await createGraphicsBroadcastReliabilityHarness(t, {
    publish: () => gate
  });

  const response = await app.inject({
    method: 'POST',
    url: '/graphics/event-a/live/quick-take',
    payload: { spec: sampleGraphic('in-flight') }
  });
  const ack = response.json();
  assert.equal(ack.delivery.status, 'in-flight');
  assert.equal(ack.delivery.pendingRevision, ack.state.revision);
  assert.equal(ack.delivery.failure, null);

  release();
  await gate;
  await new Promise((resolve) => setImmediate(resolve));
  const health = (
    await app.inject('/graphics/event-a/live/publication-health')
  ).json();
  assert.equal(health.status, 'delivered');
  assert.equal(health.lastDeliveredRevision, ack.state.revision);
});
