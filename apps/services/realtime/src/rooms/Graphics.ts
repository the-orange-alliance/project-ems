import {
  GraphicsSocketEvent,
  type GraphicsPreviewReplay,
  playbackStateEnvelopeZod,
  type PlaybackStateEnvelope,
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

/** Carries authoritative read failures to the HTTP read endpoint. */
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
 * playback envelope for a specific event key. Playback commands go directly to
 * the authoritative API instance.
 */
export default class Graphics extends Room {
  private readonly apiBaseUrl: string;
  private observePlaybackEnvelope?: (envelope: PlaybackStateEnvelope) => void;
  /** Guarantees a strictly increasing `replayId` even for two replays in the same millisecond - see `emitPreviewReplay`. */
  private lastPreviewReplayId = 0;

  public constructor(server: Server) {
    super(server, "graphics");
    this.apiBaseUrl = process.env.GRAPHICS_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  }

  public setPlaybackEnvelopeObserver(
    observer: (envelope: PlaybackStateEnvelope) => void,
  ): void {
    this.observePlaybackEnvelope = observer;
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

        await this.replayState(socket, eventKey);
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

  /** Reads the same strict envelope the API publishes and browsers receive. */
  public async getPlaybackEnvelope(
    eventKey: string,
    throwOnError = false,
  ): Promise<PlaybackStateEnvelope | null> {
    const path = `/graphics/${encodeURIComponent(eventKey)}/live/state/v1`;
    let response: Response | undefined;
    let lastError: unknown;
    for (let attempt = 1; attempt <= CONNECTION_RETRY_ATTEMPTS; attempt++) {
      try {
        response = await fetch(`${this.apiBaseUrl}${path}`, {
          headers: { accept: "application/json" },
        });
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        if (!isConnectionError(error) || attempt === CONNECTION_RETRY_ATTEMPTS)
          break;
        await delay(CONNECTION_RETRY_BASE_MS * attempt);
      }
    }
    if (lastError !== undefined || !response) {
      if (throwOnError)
        throw new RelayError(502, "The graphics API is not reachable.", true);
      logger.warn(`graphics authoritative replay failed for ${eventKey}`);
      return null;
    }
    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const { code, message } = describePlaybackError(body);
      const reason =
        code && message
          ? `${code}: ${message}`
          : (message ?? `${response.status} ${response.statusText}`);
      if (throwOnError)
        throw new RelayError(response.status, reason, response.status >= 500);
      logger.warn(
        `graphics authoritative replay rejected for ${eventKey}: ${reason}`,
      );
      return null;
    }
    try {
      const envelope = playbackStateEnvelopeZod.parse(body);
      this.observePlaybackEnvelope?.(envelope);
      return envelope;
    } catch (error) {
      const message = `Graphics API returned an invalid playback envelope: ${
        error instanceof Error ? error.message : String(error)
      }`;
      if (throwOnError) throw new RelayError(502, message, true);
      logger.error(message);
      return null;
    }
  }

  private async replayState(socket: Socket, eventKey: string): Promise<void> {
    const envelope = await this.getPlaybackEnvelope(eventKey);
    if (envelope) {
      socket.emit(GraphicsSocketEvent.PLAYBACK_STATE_V1, envelope);
    }
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

}
