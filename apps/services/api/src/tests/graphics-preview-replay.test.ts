import test from 'node:test';
import assert from 'node:assert/strict';
import { GraphicsSocketEvent, graphicsPreviewReplayZod } from '@toa-lib/models';
// Same compiled-output import as `graphics-broadcast-reliability-harness.ts` -
// see that file's long comment for why realtime's .ts source must never be
// imported from this package, and why the missing .d.ts is suppressed here.
// @ts-expect-error TS7016: no .d.ts for realtime's compiled output.
import Graphics from '../../../realtime/build/rooms/Graphics.js';

/**
 * The preview-replay broadcast (`GraphicsSocketEvent.PREVIEW_REPLAY`), which
 * backs the producer's "Replay in Preview" button and the relay's
 * `POST|GET /graphics/:eventKey/preview/replay` route.
 *
 * This is the one graphics signal the realtime relay owns outright instead
 * of relaying to the API: it is purely presentational, so there is no
 * playback command to forward and nothing durable to write. These tests pin
 * that down - including that it never reaches for the API at all.
 */

interface Emission {
  room: string;
  event: string;
  payload: unknown;
}

function stubRelay() {
  const emissions: Emission[] = [];
  const server = {
    in(room: string) {
      return {
        emit(event: string, payload: unknown) {
          emissions.push({ room, event, payload });
        }
      };
    }
  };
  return { emissions, room: new Graphics(server as never) as any };
}

test('preview replay: broadcasts to the event room with a schema-valid payload', async () => {
  const { room, emissions } = stubRelay();

  const returned = room.emitPreviewReplay('event-a');

  assert.equal(emissions.length, 1);
  assert.equal(emissions[0].room, 'graphics:event-a');
  assert.equal(emissions[0].event, GraphicsSocketEvent.PREVIEW_REPLAY);
  // The payload must carry `eventKey`: the browser's shared socket worker
  // fans events out by that field, so a listener bound to an event key would
  // never receive one without it (see `fanoutEvent` in shared-socket-worker).
  const payload = graphicsPreviewReplayZod.parse(emissions[0].payload);
  assert.equal(payload.eventKey, 'event-a');
  assert.deepEqual(returned, payload);
});

test('preview replay: replayId strictly increases, even for replays in the same millisecond', async () => {
  const { room, emissions } = stubRelay();

  // Back-to-back calls realistically land inside one millisecond; a bare
  // Date.now() would tie and a receiver - which drops anything not strictly
  // newer - would silently ignore the second press.
  const ids = [
    room.emitPreviewReplay('event-a').replayId,
    room.emitPreviewReplay('event-a').replayId,
    room.emitPreviewReplay('event-a').replayId
  ];

  assert.equal(emissions.length, 3);
  assert.ok(ids[1] > ids[0], `${ids[1]} must exceed ${ids[0]}`);
  assert.ok(ids[2] > ids[1], `${ids[2]} must exceed ${ids[1]}`);
});

test('preview replay: is event-scoped - one event never reaches another', async () => {
  const { room, emissions } = stubRelay();

  room.emitPreviewReplay('event-a');
  room.emitPreviewReplay('event-b');

  assert.deepEqual(
    emissions.map((e) => e.room),
    ['graphics:event-a', 'graphics:event-b']
  );
  // The token stays globally monotonic across events, so neither event's
  // receivers can be tricked into dropping a newer request as stale.
  const [a, b] = emissions.map(
    (e) => (e.payload as { replayId: number }).replayId
  );
  assert.ok(b > a);
});

test('preview replay: never touches the API - it is a relay-owned presentational signal', async () => {
  const { room } = stubRelay();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = (async () => {
    fetchCalls++;
    throw new Error('preview replay must not call the API');
  }) as typeof fetch;

  try {
    room.emitPreviewReplay('event-a');
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(fetchCalls, 0);
});

test('preview replay: the socket handler resolves the event key and rebroadcasts', async () => {
  const { room, emissions } = stubRelay();

  // A minimal socket: capture the handlers `initializeEvents` registers, so
  // the PREVIEW_REPLAY one can be invoked exactly as socket.io would.
  const handlers = new Map<string, (payload: unknown) => void>();
  const socket = {
    on(event: string, handler: (payload: unknown) => void) {
      handlers.set(event, handler);
    },
    join() {},
    leave() {},
    emit() {},
    data: {} as Record<string, unknown>,
    handshake: { query: {} }
  };
  room.initializeEvents(socket as never);

  const handler = handlers.get(GraphicsSocketEvent.PREVIEW_REPLAY);
  assert.ok(handler, 'the relay must register a PREVIEW_REPLAY socket handler');

  // Explicit event key in the payload.
  handler!({ eventKey: 'event-a' });
  assert.equal(emissions.length, 1);
  assert.equal(emissions[0].room, 'graphics:event-a');

  // Falls back to the key this socket subscribed with, like every other
  // handler on this relay.
  socket.data.graphicsEventKey = 'event-b';
  handler!(undefined);
  assert.equal(emissions.length, 2);
  assert.equal(emissions[1].room, 'graphics:event-b');

  // No key anywhere is a no-op, never a crash or a broadcast to everyone.
  socket.data.graphicsEventKey = undefined;
  handler!(undefined);
  assert.equal(emissions.length, 2);
});
