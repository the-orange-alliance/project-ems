import test from "node:test";
import assert from "node:assert/strict";
import {
  GraphicsSocketEvent,
  createEmptyPlaybackState,
  createPlaybackStateEnvelope,
  playbackHydrationErrorZod,
} from "@toa-lib/models";
import type { Server, Socket } from "socket.io";
import Graphics from "../rooms/Graphics.js";

/**
 * Replay is a subscribing client's ONLY hydration path, so a failed
 * authoritative read used to be a silent wedge: the relay logged a warning,
 * emitted nothing, and the browser sat in `hydrating` with every transport
 * control disabled until the page was reloaded.
 *
 * These pin down that the failure now reaches the socket that asked, that
 * each of `getPlaybackEnvelope`'s three genuinely different failure modes
 * keeps its own reason, and that this diagnosis is never broadcast to a room
 * (an audience screen must not learn about it).
 */

interface Emission {
  event: string;
  payload: unknown;
}

function stubSocket() {
  const emitted: Emission[] = [];
  const handlers = new Map<string, (p: unknown) => Promise<void> | void>();
  const socket = {
    on(event: string, handler: (p: unknown) => Promise<void> | void) {
      handlers.set(event, handler);
    },
    join() {},
    leave() {},
    emit(event: string, payload: unknown) {
      emitted.push({ event, payload });
    },
    data: {} as Record<string, unknown>,
    handshake: { query: {} },
  };
  return { emitted, handlers, socket };
}

function stubRelay() {
  const broadcasts: Emission[] = [];
  const server = {
    in() {
      return {
        emit(event: string, payload: unknown) {
          broadcasts.push({ event, payload });
        },
      };
    },
  } as unknown as Server;
  return { broadcasts, room: new Graphics(server) };
}

async function subscribeWith(
  fetchImpl: typeof globalThis.fetch,
): Promise<{ emitted: Emission[]; broadcasts: Emission[] }> {
  const { room, broadcasts } = stubRelay();
  const { emitted, handlers, socket } = stubSocket();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    room.initializeEvents(socket as unknown as Socket);
    await handlers.get("graphics:subscribe")!({ eventKey: "event-a" });
  } finally {
    globalThis.fetch = originalFetch;
  }
  return { emitted, broadcasts };
}

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

test("hydration failure: an unreachable API is reported to the subscriber, not swallowed", async () => {
  const { emitted } = await subscribeWith((async () => {
    const error = new Error("fetch failed");
    (error as { cause?: unknown }).cause = { code: "ECONNREFUSED" };
    throw error;
  }) as typeof globalThis.fetch);

  assert.equal(emitted.length, 1);
  assert.equal(
    emitted[0].event,
    GraphicsSocketEvent.PLAYBACK_HYDRATION_ERROR_V1,
  );
  const payload = playbackHydrationErrorZod.parse(emitted[0].payload);
  assert.equal(payload.eventKey, "event-a");
  assert.match(payload.message, /not reachable/i);
  // Connection failures may clear on their own - the API is often just
  // still booting - so the client is told to keep trying.
  assert.equal(payload.retryable, true);
});

test("hydration failure: an upstream rejection keeps the API's own code and message", async () => {
  const { emitted } = await subscribeWith((async () =>
    jsonResponse(409, {
      ok: false,
      // The ack shape: the real reason is nested under `error.message`, which
      // is the case `describePlaybackError` exists to read.
      error: {
        code: "NOT_READY",
        message: "No playback coordinator for this event yet",
        retryable: false,
      },
    })) as typeof globalThis.fetch);

  assert.equal(emitted.length, 1);
  const payload = playbackHydrationErrorZod.parse(emitted[0].payload);
  assert.match(payload.message, /NOT_READY/);
  assert.match(payload.message, /No playback coordinator for this event yet/);
  // A 4xx will answer the same way until something changes upstream.
  assert.equal(payload.retryable, false);
  assert.equal(payload.code, "HTTP_409");
});

test("hydration failure: an invalid envelope is named as such, not as a timeout", async () => {
  const { emitted } = await subscribeWith((async () =>
    jsonResponse(200, { schemaVersion: 99, nonsense: true })) as typeof globalThis.fetch);

  assert.equal(emitted.length, 1);
  const payload = playbackHydrationErrorZod.parse(emitted[0].payload);
  assert.match(payload.message, /invalid playback envelope/i);
  assert.equal(payload.retryable, true);
});

test("hydration failure: the three modes are distinguishable from one another", async () => {
  const unreachable = await subscribeWith((async () => {
    throw new Error("fetch failed");
  }) as typeof globalThis.fetch);
  const rejected = await subscribeWith((async () =>
    jsonResponse(503, {
      error: "UNAVAILABLE",
      code: "UNAVAILABLE",
      message: "Authoritative playback state is unavailable",
      retryable: true,
    })) as typeof globalThis.fetch);
  const invalid = await subscribeWith((async () =>
    jsonResponse(200, { not: "an envelope" })) as typeof globalThis.fetch);

  const messages = [unreachable, rejected, invalid].map(
    ({ emitted }) =>
      (emitted[0].payload as { message: string }).message,
  );
  assert.equal(new Set(messages).size, 3, messages.join(" | "));
});

test("hydration failure: the diagnosis is never broadcast to the event room", async () => {
  const { emitted, broadcasts } = await subscribeWith((async () => {
    throw new Error("fetch failed");
  }) as typeof globalThis.fetch);

  assert.equal(emitted.length, 1);
  // PGM stays fail-closed: an audience screen must not be told about this.
  assert.deepEqual(broadcasts, []);
});

test("hydration failure: a successful replay still emits the envelope and no error", async () => {
  const envelope = createPlaybackStateEnvelope(
    "epoch-a",
    createEmptyPlaybackState("event-a", "2026-01-01T00:00:00.000Z"),
  );
  const { emitted } = await subscribeWith((async () =>
    jsonResponse(200, envelope)) as typeof globalThis.fetch);

  assert.equal(emitted.length, 1);
  assert.equal(emitted[0].event, GraphicsSocketEvent.PLAYBACK_STATE_V1);
  assert.deepEqual(emitted[0].payload, envelope);
});
