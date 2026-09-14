import { timingSafeEqual } from "node:crypto";
import type { Application, Request, Response } from "express";
import {
  GraphicsSocketEvent,
  playbackPublicationZod,
  type PlaybackPublication,
} from "@toa-lib/models";
import type { Server } from "socket.io";
import Graphics from "./rooms/Graphics.js";
import logger from "./util/Logger.js";

export type PlaybackPublicationResult = {
  accepted: boolean;
  reason: "broadcast" | "duplicate" | "stale" | "retired-epoch";
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
 */
export class PlaybackPublicationReceiver {
  private readonly cursors = new Map<string, EventCursor>();
  private readonly retiredEpochs = new Map<string, Set<string>>();

  public constructor(private readonly server: Server) {}

  public accept(input: unknown): PlaybackPublicationResult {
    const publication = playbackPublicationZod.parse(input);
    const { authorityEpoch, eventKey, state } = publication;
    const current = this.cursors.get(eventKey);
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

    if (current?.authorityEpoch === authorityEpoch) {
      if (state.revision <= current.revision) {
        return {
          accepted: false,
          reason: state.revision === current.revision ? "duplicate" : "stale",
          authorityEpoch,
          eventKey,
          revision: state.revision,
        };
      }
    } else if (current) {
      retired.add(current.authorityEpoch);
      this.retiredEpochs.set(eventKey, retired);

      // A restarted API commonly republishes its already durable latest state.
      // Adopt the new epoch without broadcasting an equal revision twice.
      if (state.revision === current.revision) {
        this.cursors.set(eventKey, { authorityEpoch, revision: state.revision });
        return {
          accepted: false,
          reason: "duplicate",
          authorityEpoch,
          eventKey,
          revision: state.revision,
        };
      }
    }

    this.cursors.set(eventKey, { authorityEpoch, revision: state.revision });
    this.server
      .in(`graphics:${eventKey}`)
      .emit(GraphicsSocketEvent.STATE, {
        ...Graphics.toLegacyState(state),
        eventKey,
      });
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

/** Registers the one narrow API-to-realtime state ingestion route. */
export function registerPlaybackPublicationEndpoint(
  app: Application,
  receiver: PlaybackPublicationReceiver,
  token: string,
): void {
  app.post(
    "/internal/graphics/playback",
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
}
