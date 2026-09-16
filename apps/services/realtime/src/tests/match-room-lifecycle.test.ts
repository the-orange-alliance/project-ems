import test from "node:test";
import assert from "node:assert/strict";
import type { Server, Socket } from "socket.io";
import { MatchSocketEvent, MatchMode, MatchState } from "@toa-lib/models";
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

/** `timer`, `key` and `match` are private; the assertions below are about the observable lifecycle they encode. */
type MatchInternals = {
  timer: { mode: MatchMode; emit(event: string): void; abort(): void };
  key: unknown;
  match: unknown;
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
