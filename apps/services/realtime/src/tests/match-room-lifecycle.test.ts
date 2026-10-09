import test from "node:test";
import assert from "node:assert/strict";
import type { Server, Socket } from "socket.io";
import {
  Displays,
  MatchSocketEvent,
  MatchMode,
  MatchState,
} from "@toa-lib/models";
import Match from "../rooms/Match.js";

/**
 * The relay's match-lifecycle auditing: which transitions produce an audit
 * POST to the API, which do not, and that aborting forgets the match.
 *
 * This lived in `api`'s `stats-concurrency.test.ts` purely because that is
 * where a test runner existed; nothing here needs a database or a real API -
 * `fetch` is stubbed - so it belongs to the relay that owns the behavior.
 */

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** `timer`, `key`, `match` and `state` are private; the assertions below are about the observable lifecycle they encode. */
type MatchInternals = {
  timer: { mode: MatchMode; emit(event: string): void; abort(): void };
  key: unknown;
  match: unknown;
  state: MatchState;
};

test("realtime records lifecycle modes and abort before forgetting the match, without timer ticks", async () => {
  const handlers = new Map<string, Function>(),
    requests: any[] = [],
    server = { in: () => ({ emit: () => {} }) } as unknown as Server,
    socket = {
      on: (name: string, handler: Function) => handlers.set(name, handler),
      emit: () => {},
      handshake: { address: "test-client" },
      id: "test-socket",
      decoded: { id: 1, username: "operator" },
    } as unknown as Socket;
  const original = globalThis.fetch;
  globalThis.fetch = (async (url: any, options: any) => {
    requests.push({
      url: String(url),
      body: JSON.parse(options.body),
      signal: options.signal,
    });
    return { ok: true, status: 200 } as Response;
  }) as typeof fetch;
  const room = new Match(server);
  const internals = room as unknown as MatchInternals;
  try {
    room.initializeEvents(socket);
    const key = { eventKey: "fgc_2026_test", tournamentKey: "q", id: 1 };
    handlers.get(MatchSocketEvent.PRESTART)!(key);
    handlers.get(MatchSocketEvent.START)!();
    internals.timer.mode = MatchMode.TRANSITION;
    internals.timer.emit("timer:transition");
    internals.timer.mode = MatchMode.ENDGAME;
    internals.timer.emit("timer:endgame");
    handlers.get(MatchSocketEvent.TIMER)!();
    handlers.get(MatchSocketEvent.ABORT)!();
    await pause(10);
    const rows = requests.map((r) => r.body);
    assert.ok(rows.some((a) => a.sourceEvent === "timer:transition"));
    assert.ok(rows.some((a) => a.sourceEvent === "timer:endgame"));
    const abort = rows.find((a) => a.sourceEvent === MatchSocketEvent.ABORT);
    assert.ok(abort);
    assert.equal(
      JSON.parse(abort.newValueJson).matchState,
      MatchState.MATCH_ABORTED,
    );
    assert.equal(internals.key, null);
    assert.equal(internals.match, null);
    assert.ok(
      requests.every(
        (r) =>
          r.url.endsWith("/fgc_2026_test/q/1") &&
          r.signal instanceof AbortSignal,
      ),
    );
    assert.ok(!rows.some((a) => a.sourceEvent === MatchSocketEvent.TIMER));
  } finally {
    internals.timer.abort();
    globalThis.fetch = original;
  }
});

test("post-match score edits keep the match complete so reconnecting clients still receive END", async () => {
  const handlers = new Map<string, Function>(),
    server = { in: () => ({ emit: () => {} }) } as unknown as Server,
    socket = {
      on: (name: string, handler: Function) => handlers.set(name, handler),
      emit: () => {},
      handshake: { address: "test-client" },
      id: "test-socket",
      decoded: { id: 1, username: "operator" },
    } as unknown as Socket;
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    ({ ok: true, status: 200 }) as Response) as typeof fetch;
  const room = new Match(server);
  const internals = room as unknown as MatchInternals;
  try {
    room.initializeEvents(socket);
    const key = { eventKey: "fgc_2026_test", tournamentKey: "q", id: 1 };
    handlers.get(MatchSocketEvent.PRESTART)!(key);
    handlers.get(MatchSocketEvent.START)!();
    internals.timer.emit("timer:end");
    assert.equal(internals.state, MatchState.MATCH_COMPLETE);

    // A referee edit during result review must not advance the server state;
    // RESULTS_READY is the scorekeeper's "field cleared" step, not the relay's.
    handlers.get(MatchSocketEvent.UPDATE)!({ ...key, details: {} });
    assert.equal(internals.state, MatchState.MATCH_COMPLETE);

    const replayed: string[] = [];
    room.initializeEvents({
      on: () => {},
      emit: (event: string) => replayed.push(event),
    } as unknown as Socket);
    assert.ok(replayed.includes(MatchSocketEvent.END));
    await pause(10);
  } finally {
    internals.timer.abort();
    globalThis.fetch = original;
  }
});

/**
 * The DISPLAY broadcast on match start.
 *
 * START used to set `displayID = 2` WITHOUT emitting, so only a client that
 * connected afterwards ever learned it (via `initializeEvents`) - every screen
 * already on the wall stayed on the preview. The emit is guarded so it cannot
 * override a display the operator deliberately chose.
 */
function displayHarness() {
  const handlers = new Map<string, Function>(),
    emitted: [string, unknown][] = [],
    server = {
      in: () => ({
        emit: (name: string, payload: unknown) => emitted.push([name, payload]),
      }),
    } as unknown as Server,
    socket = {
      on: (name: string, handler: Function) => handlers.set(name, handler),
      emit: () => {},
      handshake: { address: "test-client" },
      id: "test-socket",
      decoded: { id: 1, username: "operator" },
    } as unknown as Socket;
  const room = new Match(server);
  room.initializeEvents(socket);
  return { room, handlers, emitted };
}

const DISPLAY_KEY = { eventKey: "fgc_2026_test", tournamentKey: "q", id: 1 };
const displaysOf = (emitted: [string, unknown][]) =>
  emitted.filter(([name]) => name === MatchSocketEvent.DISPLAY).map(([, id]) => id);

test("starting a match broadcasts the match display exactly once", async () => {
  const { room, handlers, emitted } = displayHarness();
  const internals = room as unknown as MatchInternals;
  try {
    handlers.get(MatchSocketEvent.PRESTART)!(DISPLAY_KEY);
    handlers.get(MatchSocketEvent.START)!();
    assert.deepEqual(displaysOf(emitted), [Displays.MATCH_PREVIEW, Displays.MATCH_START]);
    assert.equal((room as unknown as { displayID: number }).displayID, Displays.MATCH_START);
  } finally {
    internals.timer.abort();
  }
});

test("starting a match leaves an operator-chosen display alone", async () => {
  const { room, handlers, emitted } = displayHarness();
  const internals = room as unknown as MatchInternals;
  try {
    handlers.get(MatchSocketEvent.PRESTART)!(DISPLAY_KEY);
    handlers.get(MatchSocketEvent.DISPLAY)!(Displays.BLANK);
    const before = displaysOf(emitted).length;
    handlers.get(MatchSocketEvent.START)!();
    // No further DISPLAY, and the operator's choice survives.
    assert.equal(displaysOf(emitted).length, before);
    assert.equal((room as unknown as { displayID: number }).displayID, Displays.BLANK);
  } finally {
    internals.timer.abort();
  }
});

test("starting without a prestart display does not force the match screen", async () => {
  const { room, handlers, emitted } = displayHarness();
  const internals = room as unknown as MatchInternals;
  try {
    // displayID is SPONSOR (0) on a fresh room - never prestarted.
    assert.equal((room as unknown as { displayID: number }).displayID, Displays.SPONSOR);
    handlers.get(MatchSocketEvent.START)!();
    assert.deepEqual(displaysOf(emitted), []);
    assert.equal((room as unknown as { displayID: number }).displayID, Displays.SPONSOR);
  } finally {
    internals.timer.abort();
  }
});

const abortsOf = (emitted: [string, unknown][]) =>
  emitted.filter(([name]) => name === MatchSocketEvent.ABORT).length;

test("aborting a prestarted match that never started still tells clients", async () => {
  const { room, handlers, emitted } = displayHarness();
  const internals = room as unknown as MatchInternals;
  handlers.get(MatchSocketEvent.PRESTART)!(DISPLAY_KEY);
  handlers.get(MatchSocketEvent.ABORT)!();
  assert.equal(abortsOf(emitted), 1);
  assert.equal(internals.state, MatchState.MATCH_ABORTED);
  assert.equal(internals.key, null);
});

test("aborting a running match announces ABORT exactly once", async () => {
  const { room, handlers, emitted } = displayHarness();
  const internals = room as unknown as MatchInternals;
  try {
    handlers.get(MatchSocketEvent.PRESTART)!(DISPLAY_KEY);
    handlers.get(MatchSocketEvent.START)!();
    await pause(20);
    handlers.get(MatchSocketEvent.ABORT)!();
    assert.equal(abortsOf(emitted), 1);
  } finally {
    internals.timer.abort();
  }
});
