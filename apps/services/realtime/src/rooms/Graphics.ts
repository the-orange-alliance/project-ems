import {
  GraphicsQueueSocketEvent,
  GraphicsSocketEvent,
  type GraphicSpec,
  LiveGraphicState,
  type GraphicsPreviewReplay,
  type PlaybackState,
  type QueueSnapshot,
} from "@toa-lib/models";
import { Server, Socket } from "socket.io";
import logger from "../util/Logger.js";
import Room from "./Room.js";

type GraphicsSubscribePayload =
  | string
  | {
      eventKey?: string;
      timelineId?: string;
      index?: number;
      itemCount?: number;
    };

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8080";

// On a cold start the realtime service is usually listening a second or two
// before the API is. Rather than surfacing that race as an error on the first
// client subscribe, retry connection-level failures a few times with a short
// backoff and, if they persist, log them as a warning (the API may simply still
// be booting) instead of an error.
const CONNECTION_RETRY_ATTEMPTS = 3;
const CONNECTION_RETRY_BASE_MS = 300;

const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ENOTFOUND",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const { cause } = error as { cause?: { code?: unknown } };
  if (
    cause &&
    typeof cause === "object" &&
    typeof (cause as { code?: unknown }).code === "string" &&
    CONNECTION_ERROR_CODES.has((cause as { code: string }).code)
  ) {
    return true;
  }
  return /fetch failed|network|socket|econn|refused|timeout/i.test(
    error.message,
  );
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The API's `/live/*` routes answer a non-2xx with ONE of two shapes, and
 * this is the one thing that must correctly read both:
 *  - a business rejection (the OVERWHELMING majority of what shows up here -
 *    CONFLICT/NOT_READY/SUPERSEDED/INVALID_INPUT/...): a `PlaybackAcknowledgment`,
 *    `{ ok: false, error: { code, message, retryable }, state }` - the
 *    real reason is nested under `error.message`.
 *  - an unexpected-failure/validation envelope (a thrown `GraphicsRepositoryError`,
 *    a zod schema failure): `{ error: "CODE", code: "CODE", message, retryable }` -
 *    `error` is a bare string here and the message sits at the TOP level.
 * Read only the top-level `message` (as this used to) and shape 1 is
 * invisible - `error` is an object, not a string, so `"message" in body`
 * is false and every ack rejection - which is to say nearly every 409 -
 * degrades to the content-free `409 Conflict`/`409 NOT_READY` etc. HTTP
 * status text instead of "why".
 */
function describePlaybackError(body: unknown): {
  code?: string;
  message?: string;
} {
  if (!body || typeof body !== "object") return {};
  const rec = body as Record<string, unknown>;
  if (rec.error && typeof rec.error === "object") {
    const err = rec.error as Record<string, unknown>;
    return {
      code: typeof err.code === "string" ? err.code : undefined,
      message: typeof err.message === "string" ? err.message : undefined,
    };
  }
  return {
    code:
      typeof rec.code === "string"
        ? rec.code
        : typeof rec.error === "string"
          ? rec.error
          : undefined,
    message: typeof rec.message === "string" ? rec.message : undefined,
  };
}

/**
 * Raised by `fetchLegacyState` ONLY when its caller opts in with
 * `throwOnError` (the HTTP relay routes in `Server.ts` do; the socket event
 * handlers never do - they must not crash the process). Carries the upstream
 * API's real status and message so the producer UI can show "409: Playback
 * revision changed" instead of a silent no-op.
 */
export class RelayError extends Error {
  public constructor(
    public readonly status: number,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "RelayError";
  }
}

/**
 * Event-scoped relay for graphics playback.
 *
 * The realtime service no longer owns program state. It replays the durable API
 * playback state for a specific event key and forwards compatibility requests to
 * the authoritative API instance.
 */
export default class Graphics extends Room {
  private readonly apiBaseUrl: string;
  /** Guarantees a strictly increasing `replayId` even for two replays in the same millisecond - see `emitPreviewReplay`. */
  private lastPreviewReplayId = 0;

  public constructor(server: Server) {
    super(server, "graphics");
    this.apiBaseUrl = process.env.GRAPHICS_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  }

  public initializeEvents(socket: Socket): void {
    socket.on(
      "graphics:subscribe",
      async (payload: GraphicsSubscribePayload) => {
        const eventKey = this.resolveEventKey(socket, payload);
        if (!eventKey) {
          logger.warn("graphics:subscribe received without an eventKey");
          return;
        }

        socket.join(`graphics:${eventKey}`);
        socket.data.graphicsEventKey = eventKey;

        const state = await this.getState(eventKey);
        if (state) {
          socket.emit(GraphicsSocketEvent.STATE, {
            ...state,
            eventKey,
          });
        }
      },
    );

    socket.on("graphics:unsubscribe", (payload: GraphicsSubscribePayload) => {
      const eventKey = this.resolveEventKey(socket, payload);
      if (!eventKey) {
        return;
      }

      socket.leave(`graphics:${eventKey}`);
      if (socket.data.graphicsEventKey === eventKey) {
        delete socket.data.graphicsEventKey;
      }
    });

    socket.on(GraphicsQueueSocketEvent.SNAPSHOT, (payload: QueueSnapshot) => {
      logger.debug(
        `graphics queue snapshot received for relay: ${payload.entries.length} entry(s)`,
      );
    });

    socket.on(
      GraphicsSocketEvent.LOAD,
      async (payload: GraphicsSubscribePayload) => {
        const eventKey = this.resolveEventKey(socket, payload);
        if (!eventKey) {
          return;
        }

        const timelineId =
          typeof payload === "string" ? payload : payload?.timelineId;
        if (!timelineId) {
          return;
        }

        const state = await this.load(eventKey, timelineId);
        if (state) {
          this.server
            .in(`graphics:${eventKey}`)
            .emit(GraphicsSocketEvent.STATE, state);
        }
      },
    );

    socket.on(
      GraphicsSocketEvent.ADVANCE,
      async (payload: GraphicsSubscribePayload) => {
        const eventKey = this.resolveEventKey(socket, payload);
        if (!eventKey) {
          return;
        }
        const state = await this.advance(eventKey);
        if (state) {
          this.emitState(eventKey, state);
        }
      },
    );

    socket.on(
      GraphicsSocketEvent.PREVIOUS,
      async (payload: GraphicsSubscribePayload) => {
        const eventKey = this.resolveEventKey(socket, payload);
        if (!eventKey) {
          return;
        }
        const state = await this.previous(eventKey);
        if (state) {
          this.server
            .in(`graphics:${eventKey}`)
            .emit(GraphicsSocketEvent.STATE, state);
        }
      },
    );

    socket.on(
      GraphicsSocketEvent.GO,
      async (payload: number | { eventKey?: string; index?: number }) => {
        const eventKey =
          typeof payload === "number"
            ? this.resolveEventKey(socket, socket.data?.graphicsEventKey)
            : this.resolveEventKey(socket, payload);
        if (!eventKey) {
          return;
        }
        const index =
          typeof payload === "number" ? payload : (payload?.index ?? 0);
        const state = await this.go(eventKey, index);
        if (state) {
          this.emitState(eventKey, state);
        }
      },
    );

    socket.on(
      GraphicsSocketEvent.TAKE,
      async (payload: GraphicsSubscribePayload) => {
        const eventKey = this.resolveEventKey(socket, payload);
        if (!eventKey) {
          return;
        }
        const state = await this.take(eventKey);
        if (state) {
          this.emitState(eventKey, state);
        }
      },
    );

    socket.on(
      GraphicsSocketEvent.CLEAR,
      async (payload: GraphicsSubscribePayload) => {
        const eventKey = this.resolveEventKey(socket, payload);
        if (!eventKey) {
          return;
        }
        const state = await this.clear(eventKey);
        if (state) {
          this.emitState(eventKey, state);
        }
      },
    );

    socket.on(GraphicsSocketEvent.PREVIEW, () => {
      logger.debug(
        "graphics preview event ignored by relay; frame computation remains API-owned",
      );
    });

    socket.on(
      GraphicsSocketEvent.PREVIEW_REPLAY,
      (payload: GraphicsSubscribePayload) => {
        const eventKey = this.resolveEventKey(socket, payload);
        if (!eventKey) {
          return;
        }
        this.emitPreviewReplay(eventKey);
      },
    );

    const initialEventKey =
      typeof socket.handshake.query?.eventKey === "string"
        ? socket.handshake.query.eventKey
        : null;

    if (initialEventKey) {
      void this.replayState(socket, initialEventKey);
    }
  }

  public async getState(
    eventKey: string,
    throwOnError = false,
  ): Promise<LiveGraphicState | null> {
    return this.fetchLegacyState(
      eventKey,
      `/graphics/${eventKey}/live`,
      "GET",
      throwOnError,
    );
  }

  public async load(
    eventKey: string,
    timelineId: string | undefined | null,
    throwOnError = false,
    values?: Record<string, number>,
  ): Promise<LiveGraphicState | null> {
    if (!timelineId) {
      return null;
    }

    return this.fetchLegacyState(
      eventKey,
      `/graphics/${eventKey}/live/load/${encodeURIComponent(timelineId)}`,
      "POST",
      throwOnError,
      values && Object.keys(values).length > 0 ? { values } : undefined,
    );
  }

  public async unload(
    eventKey: string,
    throwOnError = false,
  ): Promise<LiveGraphicState | null> {
    return this.fetchLegacyState(
      eventKey,
      `/graphics/${eventKey}/live/unload`,
      "POST",
      throwOnError,
    );
  }

  public async advance(
    eventKey: string,
    throwOnError = false,
  ): Promise<LiveGraphicState | null> {
    return this.fetchLegacyState(
      eventKey,
      `/graphics/${eventKey}/live/advance`,
      "POST",
      throwOnError,
    );
  }

  public async previous(
    eventKey: string,
    throwOnError = false,
  ): Promise<LiveGraphicState | null> {
    return this.fetchLegacyState(
      eventKey,
      `/graphics/${eventKey}/live/previous`,
      "POST",
      throwOnError,
    );
  }

  public async go(
    eventKey: string,
    index: number,
    throwOnError = false,
  ): Promise<LiveGraphicState | null> {
    return this.fetchLegacyState(
      eventKey,
      `/graphics/${eventKey}/live/go/${encodeURIComponent(String(index))}`,
      "POST",
      throwOnError,
    );
  }

  public async take(
    eventKey: string,
    throwOnError = false,
  ): Promise<LiveGraphicState | null> {
    return this.fetchLegacyState(
      eventKey,
      `/graphics/${eventKey}/live/take`,
      "POST",
      throwOnError,
    );
  }

  /** Calculates and takes this exact ad-hoc spec atomically in the API. */
  public async quickTake(
    eventKey: string,
    spec: GraphicSpec,
    throwOnError = false,
  ): Promise<LiveGraphicState | null> {
    return this.fetchLegacyState(
      eventKey,
      `/graphics/${eventKey}/live/quick-take`,
      "POST",
      throwOnError,
      { spec },
    );
  }

  public async clear(
    eventKey: string,
    throwOnError = false,
  ): Promise<LiveGraphicState | null> {
    return this.fetchLegacyState(
      eventKey,
      `/graphics/${eventKey}/live/clear`,
      "POST",
      throwOnError,
    );
  }

  /**
   * Recalculates whatever is currently live at `destination` (`cue` or
   * `program`) with fresh data and STAGES the result - never touches `cue`/
   * `program` itself. A separate `pushUpdate` call is required to land it.
   * See `PlaybackRefresh.ts`'s own doc comment for the full contract this
   * mirrors: "recalculating a graphic NEVER changes what is on air."
   */
  public async refresh(
    eventKey: string,
    destination: "cue" | "program",
    throwOnError = false,
  ): Promise<LiveGraphicState | null> {
    return this.fetchLegacyState(
      eventKey,
      `/graphics/${eventKey}/live/refresh/${destination}`,
      "POST",
      throwOnError,
    );
  }

  /** Promotes the most recently staged `refresh` result onto whichever of `cue`/`program` it was computed for. Rejects `SUPERSEDED` if that target has since moved on - a harmless, expected race, not a caller error. */
  public async pushUpdate(
    eventKey: string,
    throwOnError = false,
  ): Promise<LiveGraphicState | null> {
    return this.fetchLegacyState(
      eventKey,
      `/graphics/${eventKey}/live/push-update`,
      "POST",
      throwOnError,
    );
  }

  private async replayState(socket: Socket, eventKey: string): Promise<void> {
    const state = await this.getState(eventKey);
    if (state) {
      socket.emit(GraphicsSocketEvent.STATE, {
        ...state,
        eventKey,
      });
    }
  }

  private emitState(eventKey: string, state: LiveGraphicState): void {
    this.server.in(`graphics:${eventKey}`).emit(GraphicsSocketEvent.STATE, {
      ...state,
      eventKey,
    });
  }

  /**
   * Broadcasts a preview-replay request to an event's clients and returns the
   * payload that was sent.
   *
   * Deliberately does NOT touch the API: this changes nothing durable (see
   * `GraphicsPreviewReplay`'s doc comment) - there is no state to forward,
   * nothing to persist, and no revision to bump. It is the one graphics
   * signal the relay owns outright rather than relaying.
   *
   * `replayId` must be strictly increasing so receivers can drop an
   * out-of-order redelivery. `Date.now()` alone is not enough - two replays
   * inside the same millisecond would tie and the second would be discarded -
   * so it is clamped to always advance past the last one issued.
   */
  public emitPreviewReplay(eventKey: string): GraphicsPreviewReplay {
    const replayId = Math.max(Date.now(), this.lastPreviewReplayId + 1);
    this.lastPreviewReplayId = replayId;
    const payload: GraphicsPreviewReplay = { eventKey, replayId };
    this.server
      .in(`graphics:${eventKey}`)
      .emit(GraphicsSocketEvent.PREVIEW_REPLAY, payload);
    return payload;
  }

  private resolveEventKey(
    socket: Socket,
    payload: GraphicsSubscribePayload | number | undefined,
  ): string | null {
    if (typeof payload === "string") {
      return payload;
    }

    if (
      payload &&
      typeof payload === "object" &&
      typeof payload.eventKey === "string"
    ) {
      return payload.eventKey;
    }

    const existing = socket.data?.graphicsEventKey;
    return typeof existing === "string" ? existing : null;
  }

  private async fetchLegacyState(
    eventKey: string,
    path: string,
    method: "GET" | "POST",
    throwOnError = false,
    requestBody?: unknown,
  ): Promise<LiveGraphicState | null> {
    // Default behaviour: never throw out of here. Every socket.io event handler
    // that calls this is `await`ed with no try/catch, so a throw becomes an
    // unhandled rejection and (Node's default `--unhandled-rejections=throw`)
    // crashes the whole realtime process - one client subscribing to a missing
    // event, or a transient API blip, would take graphics down for every event
    // and every client. A failure is logged and returned as `null`; those
    // callers already guard with `if (state)`.
    //
    // `throwOnError` opts a caller OUT of that: the HTTP relay routes in
    // `Server.ts` run inside Express handlers with their own try/catch and NEED
    // the real upstream status/message to forward to the browser instead of a
    // silent empty state. They pass `true`; they get a `RelayError`.
    let response: Response | undefined;
    let body: unknown = null;
    let lastError: unknown;
    for (let attempt = 1; attempt <= CONNECTION_RETRY_ATTEMPTS; attempt++) {
      try {
        response = await fetch(`${this.apiBaseUrl}${path}`, {
          method,
          headers: {
            accept: "application/json",
            ...(requestBody !== undefined
              ? { "content-type": "application/json" }
              : {}),
          },
          body:
            requestBody !== undefined ? JSON.stringify(requestBody) : undefined,
        });
        const payload = await response.text();
        body = payload ? JSON.parse(payload) : null;
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        if (
          !isConnectionError(error) ||
          attempt === CONNECTION_RETRY_ATTEMPTS
        ) {
          break;
        }
        const backoff = CONNECTION_RETRY_BASE_MS * attempt;
        logger.warn(
          `graphics relay: API not reachable for ${eventKey} (${path}); retrying in ${backoff}ms (${attempt}/${
            CONNECTION_RETRY_ATTEMPTS - 1
          })`,
        );
        await delay(backoff);
      }
    }

    if (lastError !== undefined || !response) {
      const message = `graphics relay API request failed for ${eventKey} (${path}): ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`;
      if (isConnectionError(lastError)) {
        logger.warn(
          `${message} — API may still be starting; serving empty state`,
        );
      } else {
        logger.error(message);
      }
      if (throwOnError) {
        throw new RelayError(
          502,
          "The graphics API is not reachable. Check that the API service is running.",
          true,
        );
      }
      return null;
    }

    if (!response.ok) {
      const { code, message } = describePlaybackError(body);
      // `reason` is what actually reaches the browser toast (via RelayError
      // below) - always lead with the business CODE (CONFLICT, NOT_READY,
      // SUPERSEDED, INVALID_INPUT, ...) then the human message, so "409
      // Conflict" becomes e.g. "CONFLICT: Playback revision changed; reload
      // state before retrying." instead of nothing.
      const reason =
        code && message
          ? `${code}: ${message}`
          : (message ?? `${response.status} ${response.statusText}`);
      // The server-side breakdown: which command, against which event, got
      // which HTTP status and why, plus the full response body (retryable,
      // the resulting `state`, ...) for anything the one-line `reason`
      // doesn't capture. Winston's format here only prints `message`, so
      // this MUST be one string, never a raw object passed as the log
      // call's argument - that would render as an empty line.
      logger.error(
        `graphics relay API error for ${eventKey}: ${method} ${path} -> ${response.status} ${response.statusText} (${reason}) | body=${JSON.stringify(body)}`,
      );
      if (throwOnError) {
        throw new RelayError(response.status, reason, response.status >= 500);
      }
      return null;
    }

    if (!body) {
      return null;
    }

    if (body && typeof body === "object" && "state" in body) {
      return this.toLegacyState(body.state as PlaybackState);
    }

    if (body && typeof body === "object" && "schemaVersion" in body) {
      return this.toLegacyState(body as PlaybackState);
    }

    return body as LiveGraphicState | null;
  }

  private toLegacyState(state: PlaybackState): LiveGraphicState {
    const { loaded } = state;
    const currentItem = loaded?.items[loaded.index] ?? null;

    // `spec`/`frame` MUST reflect `program` (what's actually on air) and
    // NOTHING else - both of this shape's consumers (the audience display
    // and the producer's own live-monitor preview, per their own doc
    // comments) render this as "what's currently broadcasting" and drive
    // enter/exit animations off changes to it. This used to prefer a
    // `ready` cue's graphic over `program`'s, which sounds harmless but
    // isn't: `advance`/`previous`/`go` always re-prepare the cue as part of
    // ordinary navigation, well before the operator ever presses Take - so
    // the moment the cue updated, `spec` would silently jump to the NEXT
    // item while `onAir` still correctly reported the OLD (still-on-air)
    // program. That mismatch had two visible symptoms: a same-mode step
    // never animated (the content had already "changed" a broadcast
    // earlier, with nothing left to diff when Take actually landed), and a
    // Clear never exited (the still-`ready` cue kept `spec` non-null, so
    // `state.program !== null` flipping to `onAir: false` was the only
    // signal a clear happened, and the transition engine reacts to `spec`/
    // `frame` changing - not to `onAir` - so it saw no change at all and
    // the display just vanished the instant `onAir` was checked to be
    // false). Keying strictly off `program` keeps `spec`/`frame` and
    // `onAir` perfectly in lockstep, exactly the invariant the transition
    // engine (`useGraphicTransition` in the web app) depends on.
    const spec = state.program?.graphic.spec ?? null;
    const frame = state.program?.graphic.frame ?? null;

    // `previewSpec` is the item ONE STEP AHEAD of the program in the loaded
    // running order - see its doc comment on `LiveGraphicState` for why this
    // must NOT come from `state.cue` (after any take, the cue holds exactly
    // what is already on air, so a cue-fed PVW mirrors PGM instead of
    // previewing it).
    //
    // The step is measured from the PROGRAM's own position, not the
    // transport's: `loaded.index` is wherever the operator has scrubbed the
    // cue to, which drifts from what the audience is seeing the moment
    // anyone advances without taking. Anchoring to `program.target.index`
    // keeps PVW stable as "the next graphic in the show" regardless.
    //
    // Two cases fall back to the transport position instead:
    //  - nothing on air: the next thing to air IS the current item, so
    //    preview it rather than the one after it.
    //  - the program came from a DIFFERENT snapshot than what is loaded now
    //    (e.g. still airing the last show while the next is cued up): its
    //    index means nothing in this snapshot's item list, so never index
    //    into it with a foreign position.
    const { program } = state;
    const anchored =
      program !== null &&
      program.graphic.target.snapshotId === loaded?.snapshotId &&
      program.graphic.target.index !== null;
    const previewIndex = !loaded
      ? null
      : anchored
        ? program!.graphic.target.index! + 1
        : loaded.index;
    // Past the last item is a legitimate "nothing next" (end of the loaded
    // running order), not an error - the queue's next entry belongs to a
    // timeline that is not loaded yet and cannot be previewed from here.
    const previewSpec =
      previewIndex === null
        ? null
        : (loaded!.items[previewIndex]?.spec ?? null);

    return {
      timelineId:
        loaded?.source.kind === "timeline"
          ? loaded.source.timelineId
          : (currentItem?.timelineId ?? null),
      index: loaded?.index ?? 0,
      spec,
      frame,
      onAir: state.program !== null,
      generation: state.revision,
      queueEntryId: currentItem?.entryId ?? null,
      armed: false,
      // Mirrors `LoadedGraphicsSnapshot.values` (see its own doc comment and
      // `LiveGraphicState.values`'s) - null for a rundown load or nothing
      // loaded, exactly like `loaded?.values` itself.
      values: loaded?.values ?? null,
      previewSpec,
    };
  }
}
