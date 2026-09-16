import { timingSafeEqual } from "node:crypto";
import { json } from "express";
import type {
  Application,
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from "express";
import {
  GraphicsSocketEvent,
  playbackPublicationZod,
  type PlaybackPublication,
} from "@toa-lib/models";
import type { Server } from "socket.io";
import logger from "./util/Logger.js";

/** The one route the API publishes authoritative playback state to. */
export const PLAYBACK_PUBLICATION_PATH = "/internal/graphics/playback";

/**
 * Env var that sizes the publication ingress. It MUST be set to the same value
 * on the API and on realtime: the API refuses to send anything larger (see
 * `RealtimePlaybackPublisher`), and realtime refuses to read anything larger.
 */
export const PLAYBACK_PUBLICATION_LIMIT_ENV = "GRAPHICS_PUBLICATION_MAX_BYTES";

/**
 * 4 MiB. Express's `json()` default is 100 KB, and an ordinary producer
 * timeline of 300 stat tiles already serialises to ~108 KB of envelope - so
 * the default silently 413'd real shows. 4 MiB is ~38x that reproduced worst
 * case, which covers any show package a producer can build by hand, while
 * still bounding what a single authenticated internal request can buffer.
 */
export const DEFAULT_PLAYBACK_PUBLICATION_LIMIT_BYTES = 4 * 1024 * 1024;

/** Resolves the configured ingress limit, falling back to the named default. */
export function resolvePlaybackPublicationLimitBytes(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env[PLAYBACK_PUBLICATION_LIMIT_ENV];
  if (raw === undefined || raw.trim() === "")
    return DEFAULT_PLAYBACK_PUBLICATION_LIMIT_BYTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0)
    throw new Error(
      `${PLAYBACK_PUBLICATION_LIMIT_ENV} must be a positive integer byte count; received "${raw}".`,
    );
  return parsed;
}

export type PlaybackPublicationResult = {
  accepted: boolean;
  reason: "broadcast" | "observed" | "duplicate" | "stale" | "retired-epoch";
  authorityEpoch: string;
  eventKey: string;
  revision: number;
};

type EventCursor = {
  authorityEpoch: string;
  revision: number;
};

/**
 * Stateless fan-out with only ephemeral delivery cursors. A changed authority
 * epoch retires the previous writer for that event. Within one epoch, only a
 * strictly newer revision is broadcast; redelivery is acknowledged harmlessly.
 *
 * Two cursors, deliberately, because two unrelated questions are being asked:
 *
 * - The EPOCH cursor answers "which API process currently owns this event?".
 *   Both `accept` and `observe` advance it, because an authoritative replay
 *   read is just as much proof of the current writer as a publication is.
 * - The BROADCAST cursor answers "has this room already been sent this
 *   revision?". ONLY `accept` advances it. A hydration read reaches exactly
 *   one client over HTTP and sends nothing to the room, so it must never make
 *   the room's delivery of that revision look like a redelivery.
 *
 * Merging them (as this once did) froze every already-subscribed display: a
 * single client hydrating at revision N+1 advanced the shared cursor, and the
 * API's real, slightly later publication of N+1 was then classified
 * `duplicate` and dropped, silently and with no error anywhere.
 */
export class PlaybackPublicationReceiver {
  /** Current writer per event; advanced by BOTH accept and observe. */
  private readonly epochCursors = new Map<string, EventCursor>();
  /** What the room has actually been sent; advanced ONLY by accept. */
  private readonly broadcastCursors = new Map<string, EventCursor>();
  private readonly retiredEpochs = new Map<string, Set<string>>();

  public constructor(private readonly server: Server) {}

  public accept(input: unknown): PlaybackPublicationResult {
    return this.process(input, true);
  }

  /**
   * Adopts an authoritative API replay into the retirement cursor ONLY, never
   * into the broadcast cursor and never onto the wire. This closes the
   * realtime-restart race where a delayed publication from the previous API
   * epoch arrives after replay hydration, without pretending the room has
   * been told anything.
   */
  public observe(input: unknown): PlaybackPublicationResult {
    return this.process(input, false);
  }

  private process(
    input: unknown,
    broadcast: boolean,
  ): PlaybackPublicationResult {
    const publication = playbackPublicationZod.parse(input);
    const { authorityEpoch, eventKey, state } = publication;
    const retired = this.retiredEpochs.get(eventKey) ?? new Set<string>();

    if (retired.has(authorityEpoch)) {
      return {
        accepted: false,
        reason: "retired-epoch",
        authorityEpoch,
        eventKey,
        revision: state.revision,
      };
    }

    const epochCursor = this.epochCursors.get(eventKey);
    if (epochCursor && epochCursor.authorityEpoch !== authorityEpoch) {
      retired.add(epochCursor.authorityEpoch);
      this.retiredEpochs.set(eventKey, retired);
    }
    this.epochCursors.set(eventKey, {
      authorityEpoch,
      revision: state.revision,
    });

    if (!broadcast) {
      return {
        accepted: true,
        reason: "observed",
        authorityEpoch,
        eventKey,
        revision: state.revision,
      };
    }

    const delivered = this.broadcastCursors.get(eventKey);
    // A changed epoch is a browser ordering reset and must be delivered even
    // at an equal/lower revision. This is the lossless authoritative event.
    if (
      delivered?.authorityEpoch === authorityEpoch &&
      state.revision <= delivered.revision
    ) {
      return {
        accepted: false,
        reason: state.revision === delivered.revision ? "duplicate" : "stale",
        authorityEpoch,
        eventKey,
        revision: state.revision,
      };
    }

    this.broadcastCursors.set(eventKey, {
      authorityEpoch,
      revision: state.revision,
    });
    this.server
      .in(`graphics:${eventKey}`)
      .emit(GraphicsSocketEvent.PLAYBACK_STATE_V1, publication);
    return {
      accepted: true,
      reason: "broadcast",
      authorityEpoch,
      eventKey,
      revision: state.revision,
    };
  }
}

function tokenMatches(header: string | undefined, expected: string): boolean {
  if (!header?.startsWith("Bearer ") || !expected) return false;
  const supplied = Buffer.from(header.slice("Bearer ".length));
  const wanted = Buffer.from(expected);
  return supplied.length === wanted.length && timingSafeEqual(supplied, wanted);
}

/**
 * Mounts the publication route's OWN JSON parser, scoped to that single path.
 *
 * Call this BEFORE the global `app.use(json())`: body-parser marks a request
 * it has already read (`req._body`), so the later global parser skips it. That
 * ordering is what keeps the large limit off every other route - the ingress
 * surface for untrusted callers does not grow with this fix.
 */
export function registerPlaybackPublicationBodyParser(
  app: Application,
  limitBytes: number = resolvePlaybackPublicationLimitBytes(),
): void {
  app.use(PLAYBACK_PUBLICATION_PATH, json({ limit: limitBytes }) as RequestHandler);
}

type BodyParserError = Error & { type?: string; length?: number };

/** Registers the one narrow API-to-realtime state ingestion route. */
export function registerPlaybackPublicationEndpoint(
  app: Application,
  receiver: PlaybackPublicationReceiver,
  token: string,
  limitBytes: number = resolvePlaybackPublicationLimitBytes(),
): void {
  app.post(
    PLAYBACK_PUBLICATION_PATH,
    (req: Request, res: Response): void => {
      if (!tokenMatches(req.header("authorization"), token)) {
        res.status(401).json({ error: "UNAUTHORIZED" });
        return;
      }
      try {
        const result = receiver.accept(req.body as PlaybackPublication);
        res.status(result.accepted ? 202 : 200).json(result);
      } catch (error) {
        logger.warn(
          `Rejected invalid internal playback publication: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        res.status(400).json({ error: "INVALID_PUBLICATION" });
      }
    },
  );

  /**
   * Parser failures reach here, not the route: without this an oversized
   * envelope answered with Express's default HTML stack trace, which an
   * operator cannot act on and which the publisher could only report as an
   * opaque 413 body. Named, actionable JSON instead.
   */
  app.use(
    PLAYBACK_PUBLICATION_PATH,
    (
      error: BodyParserError,
      _req: Request,
      res: Response,
      next: NextFunction,
    ): void => {
      if (res.headersSent) {
        next(error);
        return;
      }
      if (error?.type === "entity.too.large") {
        const received = error.length ?? null;
        const message =
          `Playback publication body of ${received ?? "unknown"} bytes exceeds the realtime ` +
          `ingress limit of ${limitBytes} bytes. Raise ${PLAYBACK_PUBLICATION_LIMIT_ENV} on BOTH ` +
          `the API and realtime services and restart them, or reduce the loaded show package; ` +
          `no state was broadcast.`;
        logger.error(message);
        res.status(413).json({
          error: "PUBLICATION_TOO_LARGE",
          code: "PUBLICATION_TOO_LARGE",
          message,
          limitBytes,
          receivedBytes: received,
          retryable: false,
        });
        return;
      }
      if (error?.type) {
        const message = `Playback publication body could not be read (${error.type}): ${error.message}`;
        logger.warn(message);
        res.status(400).json({
          error: "INVALID_PUBLICATION_BODY",
          code: "INVALID_PUBLICATION_BODY",
          message,
          retryable: false,
        });
        return;
      }
      next(error);
    },
  );
}
