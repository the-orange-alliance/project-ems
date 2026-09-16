import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";
import {
  createEmptyPlaybackState,
  GraphicsSocketEvent,
  playbackStateZod,
} from "@toa-lib/models";
import type { Server } from "socket.io";
import {
  PlaybackPublicationReceiver,
  registerPlaybackPublicationEndpoint,
} from "../PlaybackPublication.js";

/**
 * The relay-owned half of the authenticated publication ingress: fan-out,
 * revision ordering, epoch retirement, `observe` adoption, envelope validation
 * and the bearer-token check. These assertions live here, against this
 * package's own source, because nothing in them needs a real API - the
 * cross-service half (an API commit reaching a subscribed display) stays in
 * `api`'s `playback-publication-ingest.test.ts`.
 */

const PUBLICATION_TOKEN = "test-publication-token";

function state(eventKey: string, revision: number) {
  return playbackStateZod.parse({
    ...createEmptyPlaybackState(eventKey, "2026-01-01T00:00:00.000Z"),
    revision,
    lastCommandId: `revision-${revision}`,
  });
}

type Emission = { room: string; event: string; payload: any };

function fakeSocketServer() {
  const emissions: Emission[] = [];
  return {
    emissions,
    server: {
      in(room: string) {
        return {
          emit(event: string, payload: unknown) {
            emissions.push({ room, event, payload });
          },
        };
      },
    } as unknown as Server,
  };
}

function publication(
  authorityEpoch: string,
  eventKey: string,
  revision: number,
) {
  return {
    schemaVersion: 1,
    authorityEpoch,
    eventKey,
    state: state(eventKey, revision),
  };
}

test("dedupe isolates events, drops reordering, and retires prior authority epochs", () => {
  const sockets = fakeSocketServer();
  const receiver = new PlaybackPublicationReceiver(sockets.server);
  const publish = (
    authorityEpoch: string,
    eventKey: string,
    revision: number,
  ) => receiver.accept(publication(authorityEpoch, eventKey, revision));

  assert.equal(publish("epoch-a", "event-a", 2).accepted, true);
  assert.equal(publish("epoch-a", "event-a", 1).reason, "stale");
  assert.equal(publish("epoch-a", "event-a", 2).reason, "duplicate");
  assert.equal(publish("epoch-a", "event-b", 1).accepted, true);

  // Even an equal state from a restarted authority is broadcast: epoch change
  // is the browser's atomic ordering reset boundary.
  assert.equal(publish("epoch-b", "event-a", 2).reason, "broadcast");
  assert.equal(publish("epoch-a", "event-a", 99).reason, "retired-epoch");
  assert.equal(publish("epoch-b", "event-a", 3).accepted, true);

  // A genuinely replaced authority may restart its revision stream; epoch is
  // the reset boundary, and the retired writer can never reclaim the event.
  assert.equal(publish("epoch-a", "event-c", 5).accepted, true);
  assert.equal(publish("epoch-b", "event-c", 1).accepted, true);
  assert.equal(publish("epoch-a", "event-c", 99).reason, "retired-epoch");

  assert.deepEqual(
    sockets.emissions
      .filter((entry) => entry.event === GraphicsSocketEvent.PLAYBACK_STATE_V1)
      .map((entry) => [entry.room, entry.payload.state.revision]),
    [
      ["graphics:event-a", 2],
      ["graphics:event-b", 1],
      ["graphics:event-a", 2],
      ["graphics:event-a", 3],
      ["graphics:event-c", 5],
      ["graphics:event-c", 1],
    ],
  );
});

test("API replay observation retires the old publisher before delayed delivery", () => {
  const sockets = fakeSocketServer();
  const receiver = new PlaybackPublicationReceiver(sockets.server);

  assert.equal(
    receiver.accept(publication("epoch-a", "event-a", 9)).accepted,
    true,
  );
  const emissionCount = sockets.emissions.length;
  const observed = receiver.observe(publication("epoch-b", "event-a", 1));
  assert.equal(observed.accepted, true);
  assert.equal(observed.reason, "observed");
  assert.equal(
    sockets.emissions.length,
    emissionCount,
    "observation never rebroadcasts",
  );
  assert.equal(
    receiver.accept(publication("epoch-a", "event-a", 99)).reason,
    "retired-epoch",
  );
  assert.equal(
    receiver.accept(publication("epoch-b", "event-a", 2)).accepted,
    true,
  );
});

async function ingressFixture(t: import("node:test").TestContext) {
  const sockets = fakeSocketServer();
  const receiver = new PlaybackPublicationReceiver(sockets.server);
  const app = express();
  app.use(express.json());
  registerPlaybackPublicationEndpoint(app, receiver, PUBLICATION_TOKEN);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  const post = (body: unknown, authorization?: string) =>
    fetch(`${baseUrl}/internal/graphics/playback`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authorization === undefined ? {} : { authorization }),
      },
      body: JSON.stringify(body),
    });

  return { sockets, post };
}

test("ingress accepts a valid publication once and acknowledges redelivery without rebroadcasting", async (t) => {
  const { sockets, post } = await ingressFixture(t);

  const accepted = await post(
    publication("epoch-a", "event-a", 1),
    `Bearer ${PUBLICATION_TOKEN}`,
  );
  assert.equal(accepted.status, 202);
  assert.deepEqual(await accepted.json(), {
    accepted: true,
    reason: "broadcast",
    authorityEpoch: "epoch-a",
    eventKey: "event-a",
    revision: 1,
  });

  const duplicate = await post(
    publication("epoch-a", "event-a", 1),
    `Bearer ${PUBLICATION_TOKEN}`,
  );
  // A redelivery is harmless, not an error: 200 rather than 202, and no
  // second broadcast.
  assert.equal(duplicate.status, 200);
  assert.equal((await duplicate.json()).reason, "duplicate");

  const stale = await post(
    publication("epoch-a", "event-a", 0),
    `Bearer ${PUBLICATION_TOKEN}`,
  );
  assert.equal(stale.status, 200);
  assert.equal((await stale.json()).reason, "stale");

  const authoritative = sockets.emissions.filter(
    (entry) => entry.event === GraphicsSocketEvent.PLAYBACK_STATE_V1,
  );
  assert.equal(authoritative.length, 1);
  assert.equal(authoritative[0].room, "graphics:event-a");
  assert.equal(authoritative[0].payload.eventKey, "event-a");
  assert.equal(authoritative[0].payload.state.revision, 1);
});

test("ingress rejects an invalid envelope with 400 and never broadcasts it", async (t) => {
  const { sockets, post } = await ingressFixture(t);

  for (const [label, body] of [
    ["empty body", {}],
    ["partial envelope", { authorityEpoch: "epoch-a" }],
    ["missing state", { schemaVersion: 1, authorityEpoch: "e", eventKey: "k" }],
    [
      "wrong schema version",
      { ...publication("epoch-a", "event-a", 1), schemaVersion: 2 },
    ],
    [
      "malformed state",
      { schemaVersion: 1, authorityEpoch: "e", eventKey: "k", state: {} },
    ],
  ] as const) {
    const response = await post(body, `Bearer ${PUBLICATION_TOKEN}`);
    assert.equal(response.status, 400, label);
    assert.deepEqual(await response.json(), { error: "INVALID_PUBLICATION" });
  }

  assert.equal(sockets.emissions.length, 0);
});

test("ingress rejects every non-matching bearer token with 401 before parsing the body", async (t) => {
  const { sockets, post } = await ingressFixture(t);
  const valid = publication("epoch-a", "event-a", 1);

  // A wrong token of a DIFFERENT length is the case that crashes
  // `timingSafeEqual` outright unless lengths are compared first, so the
  // short/long variants below are the real regression guards for
  // `tokenMatches`: a 401 here (rather than a 500 from an uncaught throw)
  // is what proves the length check runs before the constant-time compare.
  for (const [label, authorization] of [
    ["missing header", undefined],
    ["empty header", ""],
    ["wrong token, same length", `Bearer test-publication-tokeX`],
    ["shorter token", `Bearer ${PUBLICATION_TOKEN.slice(0, -1)}`],
    ["longer token", `Bearer ${PUBLICATION_TOKEN}x`],
    ["empty token", "Bearer "],
    ["bare token without the scheme", PUBLICATION_TOKEN],
    ["wrong scheme", `Basic ${PUBLICATION_TOKEN}`],
    ["scheme is case-sensitive", `bearer ${PUBLICATION_TOKEN}`],
  ] as const) {
    const response = await post(valid, authorization);
    assert.equal(response.status, 401, label);
    assert.deepEqual(await response.json(), { error: "UNAUTHORIZED" }, label);
  }

  // An unauthenticated request must not have advanced the delivery cursor:
  // the matching token below still sees revision 1 as new.
  const accepted = await post(valid, `Bearer ${PUBLICATION_TOKEN}`);
  assert.equal(accepted.status, 202);
  assert.equal(sockets.emissions.length, 1);
});

test("ingress with an empty configured token refuses everything, including an empty bearer", async (t) => {
  const sockets = fakeSocketServer();
  const receiver = new PlaybackPublicationReceiver(sockets.server);
  const app = express();
  app.use(express.json());
  // An unset PLAYBACK_PUBLICATION_TOKEN must fail closed rather than make the
  // ingress world-writable by matching the empty string against itself.
  registerPlaybackPublicationEndpoint(app, receiver, "");
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const { port } = server.address() as AddressInfo;

  for (const authorization of ["Bearer ", "Bearer anything", undefined]) {
    const response = await fetch(
      `http://127.0.0.1:${port}/internal/graphics/playback`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(authorization === undefined ? {} : { authorization }),
        },
        body: JSON.stringify(publication("epoch-a", "event-a", 1)),
      },
    );
    assert.equal(response.status, 401);
  }
  assert.equal(sockets.emissions.length, 0);
});
