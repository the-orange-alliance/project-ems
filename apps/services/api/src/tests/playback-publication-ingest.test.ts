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
import { createRealtimePlaybackPublisher } from '../graphics/RealtimePlaybackPublisher.js';
// The realtime relay is a declared dependency of this package (see
// package.json) and is imported through its "exports" entry point, so this
// resolves to the relay's CURRENT compiled output - `npm test` here builds it
// first - rather than a stale sibling `build/` reached by relative path.
import {
  PlaybackPublicationReceiver,
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
