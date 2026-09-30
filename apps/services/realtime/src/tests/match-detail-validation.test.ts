import test from "node:test";
import assert from "node:assert/strict";
import type { Server, Socket } from "socket.io";
import {
  IgnitingInnovation,
  MatchSocketEvent,
  MatchState,
} from "@toa-lib/models";
import Match from "../rooms/Match.js";

/**
 * Per-field validation on the relay's three write paths.
 *
 * The scoring code reads `details` field by field, so one `undefined` or `null`
 * in there turns every score into NaN - which serializes to `null` over the
 * socket and leaves the audience display blank for the rest of the match. These
 * writes are therefore checked a key/value pair at a time: an unknown key or a
 * value the season's schema rejects is dropped and logged, and nothing else
 * about the match is touched.
 */

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type MatchInternals = {
  timer: { abort(): void };
  match: any;
  state: MatchState;
};

/** eventKey must start with the season key - `getSeasonKeyFromEventKey` splits on "-". */
const KEY = { eventKey: "fgc_2026-TEST-1", tournamentKey: "q", id: 1 };

const liveMatch = () => ({
  ...KEY,
  name: "Ranking Match 1",
  fieldNumber: 1,
  scheduledTime: "",
  prestartTime: "",
  actualStartTime: "",
  cycleTime: 0,
  redScore: 0,
  redMinPen: 0,
  redMajPen: 0,
  blueScore: 0,
  blueMinPen: 0,
  blueMajPen: 0,
  active: 1,
  result: -1,
  uploaded: 0,
  details: {
    ...IgnitingInnovation.defaultMatchDetails,
    ...KEY,
  },
});

/** A room holding a live fgc_2026 match, plus the socket handlers registered on it. */
const startedRoom = () => {
  const handlers = new Map<string, Function>(),
    emitted: { event: string; payload?: any }[] = [],
    server = { in: () => ({ emit: () => {} }) } as unknown as Server,
    socket = {
      on: (name: string, handler: Function) => handlers.set(name, handler),
      emit: (event: string, payload?: any) => emitted.push({ event, payload }),
      handshake: { address: "test-client" },
      id: "test-socket",
      decoded: { id: 1, username: "operator" },
    } as unknown as Socket;
  const room = new Match(server);
  room.initializeEvents(socket);
  handlers.get(MatchSocketEvent.PRESTART)!(KEY);
  handlers.get(MatchSocketEvent.UPDATE)!(liveMatch());
  return {
    room,
    handlers,
    emitted,
    internals: room as unknown as MatchInternals,
  };
};

const withStubbedFetch = async (body: () => Promise<void> | void) => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({ ok: true, status: 200 }) as Response) as typeof fetch;
  try {
    await body();
    await pause(10);
  } finally {
    globalThis.fetch = original;
  }
};

test("a valid details item is written and rescored", async () => {
  await withStubbedFetch(() => {
    const { handlers, internals } = startedRoom();
    try {
      handlers.get(MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM)!({
        key: "wildfireInRedSuppressionUnit",
        value: 7,
      });
      assert.equal(internals.match.details.wildfireInRedSuppressionUnit, 7);
      assert.equal(internals.match.redScore, 7);
    } finally {
      internals.timer.abort();
    }
  });
});

test("a details item the season does not declare is dropped", async () => {
  await withStubbedFetch(() => {
    const { handlers, internals } = startedRoom();
    try {
      handlers.get(MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM)!({
        key: "wildfireInPurpleSuppressionUnit",
        value: 7,
      });
      assert.ok(!("wildfireInPurpleSuppressionUnit" in internals.match.details));
      assert.ok(Number.isFinite(internals.match.redScore));
    } finally {
      internals.timer.abort();
    }
  });
});

test("a details item whose value the season rejects leaves the old value in place", async () => {
  await withStubbedFetch(() => {
    const { handlers, internals } = startedRoom();
    try {
      handlers.get(MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM)!({
        key: "wildfireInRedSuppressionUnit",
        value: 5,
      });
      // What a cleared number input used to send: NaN, arriving as null.
      handlers.get(MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM)!({
        key: "wildfireInRedSuppressionUnit",
        value: null,
      });
      assert.equal(internals.match.details.wildfireInRedSuppressionUnit, 5);
      assert.equal(internals.match.redScore, 5);
    } finally {
      internals.timer.abort();
    }
  });
});

test("a number adjustment against an undeclared key cannot write NaN", async () => {
  await withStubbedFetch(() => {
    const { handlers, internals } = startedRoom();
    try {
      handlers.get(MatchSocketEvent.MATCH_ADJUST_DETAILS_NUMBER)!({
        key: "notAField",
        adjustment: 1,
      });
      assert.ok(!("notAField" in internals.match.details));
      assert.ok(Number.isFinite(internals.match.redScore));
    } finally {
      internals.timer.abort();
    }
  });
});

test("SYNC replays the live match to a client that missed the join replay", async () => {
  await withStubbedFetch(() => {
    const { handlers, internals, emitted } = startedRoom();
    try {
      // The relay replays the match only once it is actually being played.
      handlers.get(MatchSocketEvent.START)!();
      handlers.get(MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM)!({
        key: "wildfireInRedSuppressionUnit",
        value: 4,
      });

      // A client whose listeners were not up when it joined: the room replayed
      // to nobody, so it asks again. Without this it sat on the database's score.
      emitted.length = 0;
      handlers.get(MatchSocketEvent.SYNC)!();

      const update = emitted.find(
        (r) => r.event === MatchSocketEvent.UPDATE,
      )?.payload;
      assert.ok(update, "SYNC did not replay the match");
      assert.equal(update.redScore, 4);
      assert.equal(update.details.wildfireInRedSuppressionUnit, 4);
    } finally {
      internals.timer.abort();
    }
  });
});

test("a null penalty is rejected rather than nulling the score", async () => {
  await withStubbedFetch(() => {
    const { handlers, internals } = startedRoom();
    try {
      handlers.get(MatchSocketEvent.MATCH_UPDATE_ITEM)!({
        key: "redMinPen",
        value: null,
      });
      assert.equal(internals.match.redMinPen, 0);
      assert.ok(Number.isFinite(internals.match.blueScore));

      handlers.get(MatchSocketEvent.MATCH_UPDATE_ITEM)!({
        key: "redMinPen",
        value: 2,
      });
      assert.equal(internals.match.redMinPen, 2);
    } finally {
      internals.timer.abort();
    }
  });
});
