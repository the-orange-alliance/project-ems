import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import express from 'express';
import type { Server } from 'socket.io';
import {
  createEmptyPlaybackState,
  GraphicsSocketEvent,
  playbackStateZod
} from '@toa-lib/models/base';
import {
  createRealtimePlaybackPublisher,
  DEFAULT_PUBLICATION_BODY_BYTES
} from '../graphics/RealtimePlaybackPublisher.js';
// The realtime relay is a declared dependency of this package (see
// package.json) and is imported through its "exports" entry point, so this
// resolves to the relay's CURRENT compiled output - `npm test` here builds it
// first - rather than a stale sibling `build/` reached by relative path.
import {
  DEFAULT_PLAYBACK_PUBLICATION_LIMIT_BYTES,
  PlaybackPublicationReceiver,
  registerPlaybackPublicationBodyParser,
  registerPlaybackPublicationEndpoint
} from 'realtime/PlaybackPublication';

/**
 * Genuinely cross-service: this package's publisher must reach a real relay
 * ingress and land in the room a subscribed display is listening on.
 *
 * The relay-owned half of this boundary - revision ordering, epoch
 * retirement, `observe` adoption, envelope validation and the bearer-token
 * check - is asserted in realtime's own `playback-publication.test.ts` and is
 * deliberately not repeated here.
 */

function state(eventKey: string, revision: number) {
  return playbackStateZod.parse({
    ...createEmptyPlaybackState(eventKey, '2026-01-01T00:00:00.000Z'),
    revision,
    lastCommandId: `revision-${revision}`
  });
}

function fakeSocketServer() {
  const emissions: Array<{ room: string; event: string; payload: any }> = [];
  return {
    emissions,
    server: {
      in(room: string) {
        return {
          emit(event: string, payload: unknown) {
            emissions.push({ room, event, payload });
          }
        };
      }
    } as unknown as Server
  };
}

test('the API publisher authenticates to the real relay ingress and reaches the event audience once', async (t) => {
  const sockets = fakeSocketServer();
  const receiver = new PlaybackPublicationReceiver(sockets.server);
  const app = express();
  app.use(express.json());
  registerPlaybackPublicationEndpoint(app, receiver, 'test-publication-token');
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const publisher = createRealtimePlaybackPublisher({
    baseUrl,
    token: 'test-publication-token',
    authorityEpoch: 'epoch-a',
    timeoutMs: 500
  });
  // The second publish is the API retrying a revision the relay already has:
  // the publisher must treat the relay's "duplicate" acknowledgment as
  // success, and the audience must not see the graphic twice.
  await publisher.publish('event-a', state('event-a', 1));
  await publisher.publish('event-a', state('event-a', 1));

  assert.equal(sockets.emissions.length, 1);
  const authoritative = sockets.emissions.filter(
    (entry) => entry.event === GraphicsSocketEvent.PLAYBACK_STATE_V1
  );
  assert.equal(authoritative.length, 1);
  assert.equal(authoritative[0].room, 'graphics:event-a');
  assert.equal(authoritative[0].payload.eventKey, 'event-a');
  assert.equal(authoritative[0].payload.state.revision, 1);
});

test('a publisher configured with the wrong token never reaches the audience', async (t) => {
  const sockets = fakeSocketServer();
  const receiver = new PlaybackPublicationReceiver(sockets.server);
  const app = express();
  app.use(express.json());
  registerPlaybackPublicationEndpoint(app, receiver, 'test-publication-token');
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address() as AddressInfo;

  const publisher = createRealtimePlaybackPublisher({
    baseUrl: `http://127.0.0.1:${address.port}`,
    token: 'not-the-configured-token',
    authorityEpoch: 'epoch-a',
    timeoutMs: 500
  });

  await assert.rejects(() => publisher.publish('event-a', state('event-a', 1)));
  assert.equal(sockets.emissions.length, 0);
});

/**
 * A realistic large show package: one loaded timeline snapshot of 300 stat
 * tiles, carried both as the timeline's items and as the snapshot's resolved
 * items, exactly as a real `load` commits it. This serialises well past
 * express's 100 KB `json()` default, which is what used to 413 silently.
 */
function loadedState(eventKey: string, revision: number, itemCount = 300) {
  const at = '2026-01-01T00:00:00.000Z';
  const specs = Array.from({ length: itemCount }, (_unused, index) => ({
    id: `spec-${index}`,
    title: `Alliance scoring leaders segment ${index}`,
    subtitle: 'Qualification match production package',
    stat: 'alliance-scoring-leaders',
    selectors: {},
    filters: {},
    params: { note: `padding-${index}`.padEnd(220, 'x') },
    kind: 'stat-tile' as const,
    mode: 'fullscreen' as const,
    options: {}
  }));
  return playbackStateZod.parse({
    ...createEmptyPlaybackState(eventKey, at),
    revision,
    lastCommandId: `revision-${revision}`,
    loaded: {
      snapshotId: 'snapshot-1',
      source: { kind: 'timeline', timelineId: 'timeline-1', revision: 1 },
      timelines: [
        {
          schemaVersion: 2,
          revision: 1,
          timelineId: 'timeline-1',
          eventKey,
          name: 'Production package',
          items: specs,
          updatedAtUtc: at
        }
      ],
      items: specs.map((spec, itemIndex) => ({
        timelineId: 'timeline-1',
        timelineRevision: 1,
        itemIndex,
        spec
      })),
      index: 0,
      loadedAtUtc: at
    }
  });
}

async function relayFixture(t: import('node:test').TestContext, limitBytes: number) {
  const sockets = fakeSocketServer();
  const receiver = new PlaybackPublicationReceiver(sockets.server);
  const app = express();
  registerPlaybackPublicationBodyParser(app, limitBytes);
  app.use(express.json());
  registerPlaybackPublicationEndpoint(
    app,
    receiver,
    'test-publication-token',
    limitBytes
  );
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address() as AddressInfo;
  return { sockets, baseUrl: `http://127.0.0.1:${address.port}` };
}

test('an ordinary large show package publishes end to end past the 100 KB parser default', async (t) => {
  const limitBytes = DEFAULT_PLAYBACK_PUBLICATION_LIMIT_BYTES;
  const { sockets, baseUrl } = await relayFixture(t, limitBytes);
  const publisher = createRealtimePlaybackPublisher({
    baseUrl,
    token: 'test-publication-token',
    authorityEpoch: 'epoch-a',
    timeoutMs: 2000,
    maxBodyBytes: limitBytes
  });

  const state = loadedState('event-a', 1);
  assert.ok(Buffer.byteLength(JSON.stringify(state)) > 100 * 1024);
  await publisher.publish('event-a', state);

  assert.equal(
    sockets.emissions.filter(
      (entry) => entry.event === GraphicsSocketEvent.PLAYBACK_STATE_V1
    ).length,
    1
  );
});

test('the publisher refuses an over-limit envelope before sending, naming size, limit, event and revision', async (t) => {
  const limitBytes = 4096;
  const { sockets, baseUrl } = await relayFixture(t, limitBytes);
  let sent = 0;
  const publisher = createRealtimePlaybackPublisher({
    baseUrl,
    token: 'test-publication-token',
    authorityEpoch: 'epoch-a',
    timeoutMs: 2000,
    maxBodyBytes: limitBytes,
    fetch: (async (...args: Parameters<typeof globalThis.fetch>) => {
      sent++;
      return globalThis.fetch(...args);
    }) as typeof globalThis.fetch
  });

  const state = loadedState('event-a', 42);
  const bytes = Buffer.byteLength(
    JSON.stringify({
      schemaVersion: 1,
      authorityEpoch: 'epoch-a',
      eventKey: 'event-a',
      state
    })
  );
  const error = await publisher.publish('event-a', state).then(
    () => null,
    (reason: unknown) => reason
  );

  assert.ok(error instanceof Error, 'an over-limit publication must fail loudly');
  const message = (error as Error).message;
  for (const fragment of [
    String(bytes),
    String(limitBytes),
    'event-a',
    '42',
    'GRAPHICS_PUBLICATION_MAX_BYTES'
  ])
    assert.ok(
      message.includes(fragment),
      `error must name ${fragment}; got: ${message}`
    );
  assert.ok(!message.includes('<html'), 'never an HTML 413 body');
  assert.equal(sent, 0, 'a doomed body must never hit the network');
  assert.equal(sockets.emissions.length, 0);

  // Structurally undeliverable, so retrying it is pointless: the coordinator
  // must be told to park rather than back off forever.
  assert.equal(
    (error as Error & { retryable?: boolean }).retryable,
    false
  );
});

test('the API and the relay default to the same configured ingress limit', () => {
  assert.equal(
    DEFAULT_PUBLICATION_BODY_BYTES,
    DEFAULT_PLAYBACK_PUBLICATION_LIMIT_BYTES
  );
});
