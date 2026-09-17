import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import { getPlaybackCoordinator } from '../graphics/PlaybackCoordinatorService.js';
import { graphicsFixture } from './graphics-test-support.js';

test('getPlaybackCoordinator returns one coordinator per Fastify server and a different one for another app', async (t) => {
  const { repository } = await graphicsFixture(t);
  const app = Fastify();
  const other = Fastify();
  t.after(async () => {
    await app.close();
    await other.close();
  });

  const first = getPlaybackCoordinator(app, { repository });
  const second = getPlaybackCoordinator(app, { repository });
  assert.equal(first, second);

  const third = getPlaybackCoordinator(other, { repository });
  assert.notEqual(first, third);
});

test('publisher configuration survives later Fastify plugin registration order', async (t) => {
  const { repository } = await graphicsFixture(t);
  const app = Fastify();
  const delivered: number[] = [];
  const configured = getPlaybackCoordinator(app, {
    repository,
    publish: async (_eventKey, state) => {
      delivered.push(state.revision);
    }
  });

  let fromPlugin: typeof configured | undefined;
  await app.register(async (plugin) => {
    fromPlugin = getPlaybackCoordinator(plugin);
  });
  await app.ready();

  assert.equal(fromPlugin, configured);
  const ack = await fromPlugin!.mutate(
    'event-a',
    { type: 'clear', requestId: 'plugin-order-1' },
    () => {}
  );
  assert.equal(ack.ok, true);
  await configured.retryPublication('event-a');
  assert.ok(delivered.includes(ack.ok ? ack.state.revision : -1));
  await app.close();
});

test('graceful shutdown drains an in-flight publication before the app finishes closing', async (t) => {
  const { repository } = await graphicsFixture(t);
  const app = Fastify();
  let shouldFail = true;
  const coordinator = getPlaybackCoordinator(app, {
    repository,
    publish: async () => {
      if (shouldFail) throw new Error('relay unavailable');
    }
  });

  const ack = await coordinator.mutate(
    'event-a',
    { type: 'clear', requestId: 'svc-shutdown-1' },
    (draft) => {
      draft.cue = { status: 'empty' };
      draft.program = null;
      draft.stagedUpdate = { status: 'empty' };
    }
  );
  assert.equal(ack.ok, true);

  // Join the commit's own fire-and-forget publish attempt (which fails) rather than racing it.
  await coordinator.retryPublication('event-a').catch(() => {});
  assert.ok(coordinator.deliveryHealth('event-a').error);

  shouldFail = false;
  await app.close(); // onClose drains the still-pending publication, which now succeeds.

  assert.equal(coordinator.deliveryHealth('event-a').pendingRevision, null);
  assert.equal(coordinator.deliveryHealth('event-a').error, null);
});

test('getPlaybackCoordinator with no publish configured never attempts delivery, and shutdown is a no-op', async (t) => {
  const { repository } = await graphicsFixture(t);
  const app = Fastify();
  const coordinator = getPlaybackCoordinator(app, { repository });

  const ack = await coordinator.mutate(
    'event-b',
    { type: 'clear', requestId: 'svc-no-publish-1' },
    (draft) => {
      draft.cue = { status: 'empty' };
      draft.program = null;
      draft.stagedUpdate = { status: 'empty' };
    }
  );
  assert.equal(ack.ok, true);
  assert.deepEqual(coordinator.deliveryHealth('event-b'), {
    eventKey: 'event-b',
    status: 'unconfigured',
    failure: null,
    configured: false,
    pendingRevision: null,
    attempts: 0,
    nextRetryAtUtc: null,
    lastDeliveredRevision: null,
    lastDeliveredAtUtc: null,
    error: null
  });

  await app.close();
});

test('graceful shutdown is bounded when realtime never completes a request', async (t) => {
  const { repository } = await graphicsFixture(t);
  const app = Fastify();
  const coordinator = getPlaybackCoordinator(app, {
    repository,
    publish: () => new Promise<void>(() => {}),
    shutdownTimeoutMs: 20
  });

  const ack = await coordinator.mutate(
    'event-a',
    { type: 'clear', requestId: 'bounded-shutdown-1' },
    () => {}
  );
  assert.equal(ack.ok, true);
  assert.equal(
    coordinator.deliveryHealth('event-a').pendingRevision,
    ack.ok ? ack.state.revision : -1
  );

  const started = Date.now();
  await app.close();
  assert.ok(Date.now() - started < 500, 'shutdown exceeded its bounded drain');
});
