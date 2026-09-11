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
    pendingRevision: null,
    error: null
  });

  await app.close();
});
