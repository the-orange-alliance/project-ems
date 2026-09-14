import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import express from 'express';
import {
  createEmptyPlaybackState,
  playbackStateZod
} from '@toa-lib/models/base';
import { createRealtimePlaybackPublisher } from '../graphics/RealtimePlaybackPublisher.js';
// The reliability harness intentionally tests the already-compiled realtime
// boundary without pulling its source tree into the API TypeScript rootDir.
// @ts-expect-error realtime does not emit declarations.
import { PlaybackPublicationReceiver, registerPlaybackPublicationEndpoint } from '../../../realtime/build/PlaybackPublication.js';

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
    }
  };
}

test('authenticated internal ingestion validates complete state and broadcasts once', async (t) => {
  const sockets = fakeSocketServer();
  const receiver = new PlaybackPublicationReceiver(sockets.server as any);
  const app = express();
  app.use(express.json());
  registerPlaybackPublicationEndpoint(app, receiver, 'test-publication-token');
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const unauthorized = await fetch(`${baseUrl}/internal/graphics/playback`, {
    method: 'POST',
    headers: {
      authorization: 'Bearer wrong-token',
      'content-type': 'application/json'
    },
    body: JSON.stringify({})
  });
  assert.equal(unauthorized.status, 401);

  const invalid = await fetch(`${baseUrl}/internal/graphics/playback`, {
    method: 'POST',
    headers: {
      authorization: 'Bearer test-publication-token',
      'content-type': 'application/json'
    },
    body: JSON.stringify({ authorityEpoch: 'epoch-a' })
  });
  assert.equal(invalid.status, 400);

  const publisher = createRealtimePlaybackPublisher({
    baseUrl,
    token: 'test-publication-token',
    authorityEpoch: 'epoch-a',
    timeoutMs: 500
  });
  await publisher.publish('event-a', state('event-a', 1));
  await publisher.publish('event-a', state('event-a', 1));

  assert.equal(sockets.emissions.length, 1);
  assert.equal(sockets.emissions[0].room, 'graphics:event-a');
  assert.equal(sockets.emissions[0].payload.eventKey, 'event-a');
  assert.equal(sockets.emissions[0].payload.generation, 1);
});

test('realtime dedupe isolates events, drops reordering, and retires prior authority epochs', () => {
  const sockets = fakeSocketServer();
  const receiver = new PlaybackPublicationReceiver(sockets.server as any);
  const publish = (authorityEpoch: string, eventKey: string, revision: number) =>
    receiver.accept({ authorityEpoch, eventKey, state: state(eventKey, revision) });

  assert.equal(publish('epoch-a', 'event-a', 2).accepted, true);
  assert.equal(publish('epoch-a', 'event-a', 1).reason, 'stale');
  assert.equal(publish('epoch-a', 'event-a', 2).reason, 'duplicate');
  assert.equal(publish('epoch-a', 'event-b', 1).accepted, true);

  // Equal state from a restarted authority adopts the epoch without another
  // audience event, and any delayed request from the retired process is inert.
  assert.equal(publish('epoch-b', 'event-a', 2).reason, 'duplicate');
  assert.equal(publish('epoch-a', 'event-a', 99).reason, 'retired-epoch');
  assert.equal(publish('epoch-b', 'event-a', 3).accepted, true);

  // A genuinely replaced authority may restart its revision stream; epoch is
  // the reset boundary, and the retired writer can never reclaim the event.
  assert.equal(publish('epoch-a', 'event-c', 5).accepted, true);
  assert.equal(publish('epoch-b', 'event-c', 1).accepted, true);
  assert.equal(publish('epoch-a', 'event-c', 99).reason, 'retired-epoch');

  assert.deepEqual(
    sockets.emissions.map((entry) => [entry.room, entry.payload.generation]),
    [
      ['graphics:event-a', 2],
      ['graphics:event-b', 1],
      ['graphics:event-a', 3],
      ['graphics:event-c', 5],
      ['graphics:event-c', 1]
    ]
  );
});
