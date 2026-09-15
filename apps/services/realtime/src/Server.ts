import express, { Application, json } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import parser from "body-parser";
import jwt from "jsonwebtoken";
import { environment as env, getIPv4 } from "@toa-lib/server";
import logger from "./util/Logger.js";
import {
  assignRooms,
  getGraphicsRoom,
  initRooms,
  isGraphicsDisabled,
  leaveRooms,
} from "./rooms/Rooms.js";
import Graphics, { RelayError } from "./rooms/Graphics.js";
import {
  playbackStateEnvelopeZod,
  type LiveGraphicState,
} from "@toa-lib/models";
import { join } from "path";
import {
  PlaybackPublicationReceiver,
  registerPlaybackPublicationEndpoint,
} from "./PlaybackPublication.js";

// Setup our environment
const workingDir = process.env.WORKDIR ?? "../";
const path = join(workingDir, "/realtime/.env");
env.loadAndSetDefaults(process.env, path);

// Bind socket.io to express to our http server
const app: Application = express();
const server = createServer(app);
const io = new Server(server);

// Config middleware
app.use(cors({ credentials: true }));
app.use(json());
app.use(parser.urlencoded({ extended: false }));

io.use((socket, next) => {
  (socket as any).decoded = { id: 0, username: "Bypassed", permissions: "*" };
  return next();

  // Disable auth for now
  if (socket.handshake.query && socket.handshake.query.token) {
    jwt.verify(
      // @ts-ignore
      socket.handshake.query.token.toString(),
      env.get().jwtSecret,
      (err, decoded) => {
        if (err) {
          return next(new Error("Authentication Error"));
        } else {
          (socket as any).decoded = decoded;
          next();
        }
      },
    );
  } else {
    next(new Error("Authentication Error: no query token present"));
  }
});

io.on("connection", (socket) => {
  const user = (socket as any).decoded;
  logger.info(
    `user '${user.username}' (${socket.handshake.address}) connected and verified`,
  );

  socket.on("identify", async (data: any) => {
    try {
      // Add things
      data.lastSocketId = socket.id;
      data.ipAddress = socket.handshake.address;

      // Send back IP and socket id
      socket.emit("identify-response", data);
    } catch (e) {
      console.log("Failed to negotiate sockets settings", e);
    }
  });

  socket.on("update-socket-client", async (data: any) => {
    // Update socket client
    try {
      // Locate socket by lastSocketId
      const socketToUpdate = io.sockets.sockets.get(data.lastSocketId);
      // Update socket
      socketToUpdate?.emit("settings", data);
    } catch (e) {
      console.log("Failed to update socket client", e);
    }
  });

  socket.on("identify-client", async (data: any) => {
    // Find socket
    const socketToIdentify = io.sockets.sockets.get(data.lastSocketId);
    // Emit message
    socketToIdentify?.emit("identify-client", data);
  });

  socket.on("refresh-client", async (data: any) => {
    // Find socket
    const socketToIdentify = io.sockets.sockets.get(data.lastSocketId);
    // Emit message
    socketToIdentify?.emit("refresh-client", data);
  });

  socket.on("identify-all-clients", async (data) => {
    try {
      // Get all devices from api
      const { clients } = data;
      // Iterate over devices
      clients.forEach((client: any) => {
        // Find socket
        const socketToIdentify = io.sockets.sockets.get(client.lastSocketId);
        // Emit message
        socketToIdentify?.emit("identify-client", client);
      });
    } catch (e) {
      console.log("Failed to identify all clients", e);
    }
  });

  socket.on("rooms", (rooms: unknown) => {
    if (
      Array.isArray(rooms) &&
      rooms.every((room) => typeof room === "string")
    ) {
      logger.info(
        `user ${user.username} (${socket.handshake.address}) joining rooms ${rooms}`,
      );
      assignRooms(rooms, socket);
    } else {
      logger.warn(
        `user ${user.username} (${socket.handshake.address}) sent "rooms" event with invalid payload: ${rooms}`,
      );
    }
  });

  socket.on("disconnect", (reason: string) => {
    logger.info(
      `user ${user.username} (${socket.handshake.address}) disconnected: ${reason}`,
    );
    leaveRooms(socket);
  });

  socket.on("error", (err) => {
    logger.error({ err });
  });
});

initRooms(io);

if (!isGraphicsDisabled()) {
  const playbackReceiver = new PlaybackPublicationReceiver(io);
  getGraphicsRoom()?.setPlaybackEnvelopeObserver((envelope) => {
    playbackReceiver.observe(envelope);
  });
  registerPlaybackPublicationEndpoint(
    app,
    playbackReceiver,
    process.env.GRAPHICS_PUBLICATION_TOKEN ?? env.get().jwtSecret,
  );
}

// ---------------------------------------------------------------------------
// Graphics REST endpoints
//
// These Compatibility routes stay available for producer UI and Companion
// integrations, but the realtime service now treats the API as the source of
// truth. Each route forwards to the authoritative graphics playback endpoint,
// then translates the durable playback state back into the legacy
// LiveGraphicState shape that older socket/browser clients still expect.
// ---------------------------------------------------------------------------

// When `DISABLE_GRAPHICS` is set, the `Graphics` room is never constructed
// (see `isGraphicsDisabled` in `Rooms.ts`) and none of these routes are
// registered at all - a disabled instance doesn't expose `/graphics/*`
// endpoints or reach out to `GRAPHICS_API_BASE_URL` in the background.
if (!isGraphicsDisabled()) {
  const defaultLiveGraphicState = {
    timelineId: null,
    index: 0,
    spec: null,
    frame: null,
    onAir: false,
    generation: 0,
    queueEntryId: null,
    armed: false,
    values: null,
    previewSpec: null,
  };

  async function sendLiveGraphicState(
    res: express.Response,
    eventKey: string,
    route: string,
    method: "GET" | "POST" = "GET",
  ): Promise<void> {
    const room = getGraphicsRoom();
    if (!room) {
      res.status(503).json({
        error: "UNAVAILABLE",
        code: "UNAVAILABLE",
        message: "Graphics relay is unavailable",
        retryable: true,
      });
      return;
    }

    try {
      const state =
        method === "GET"
          ? await room.getState(eventKey)
          : await room.load(eventKey, route);

      res.status(200).json(state ?? defaultLiveGraphicState);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Graphics relay request failed";
      res.status(503).json({
        error: "UNAVAILABLE",
        code: "UNAVAILABLE",
        message,
        retryable: true,
      });
    }
  }

  app.get("/graphics/:eventKey/live", async (req, res) => {
    await sendLiveGraphicState(res, req.params.eventKey, "", "GET");
  });

  /** Lossless, versioned read; identical to publication/socket delivery. */
  app.get("/graphics/:eventKey/live/state/v1", async (req, res) => {
    const room = getGraphicsRoom();
    if (!room) {
      res.status(503).json({
        error: "UNAVAILABLE",
        code: "UNAVAILABLE",
        message: "Graphics relay is unavailable",
        retryable: true,
      });
      return;
    }
    try {
      const envelope = await room.getPlaybackEnvelope(
        req.params.eventKey,
        true,
      );
      if (!envelope) {
        res.status(503).json({
          error: "UNAVAILABLE",
          code: "UNAVAILABLE",
          message: "Authoritative playback state is unavailable",
          retryable: true,
        });
        return;
      }
      res.status(200).json(playbackStateEnvelopeZod.parse(envelope));
    } catch (error) {
      const status = error instanceof RelayError ? error.status : 503;
      res.status(status).json({
        error: "UPSTREAM_ERROR",
        code: "UPSTREAM_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Graphics relay request failed",
        retryable: status >= 500,
      });
    }
  });

  /**
   * Runs one graphics command against the relay room and forwards its REAL
   * outcome to the browser.
   *
   * The command routes below used to answer `200` + an empty `LiveGraphicState`
   * whenever the upstream API rejected or was unreachable, so the producer UI
   * saw a successful no-op and the button "did nothing". Now the room is asked
   * with `throwOnError`, and a `RelayError` is relayed with the upstream's own
   * status and message (`409 Playback revision changed`, `400 Index out of
   * range`, `502 API not reachable`, …) so the UI can surface it.
   *
   * A `null` with no `RelayError` still means "the API answered 2xx with an
   * empty body" - a genuine nothing-to-report, not a failure - and is passed
   * through as the empty state.
   *
   * These routes are deprecated compatibility proxies. They deliberately do
   * not broadcast the returned acknowledgment: every successful API commit is
   * independently published through the authenticated internal endpoint, so
   * broadcasting here would create a second, racing publication path.
   */
  async function relayCommand(
    res: express.Response,
    eventKey: string,
    run: (room: Graphics) => Promise<LiveGraphicState | null>,
  ): Promise<void> {
    const room = getGraphicsRoom();
    if (!room) {
      res.status(503).json({
        error: "UNAVAILABLE",
        code: "UNAVAILABLE",
        message: "Graphics relay is unavailable",
        retryable: true,
      });
      return;
    }

    try {
      const state = await run(room);
      res.setHeader("Deprecation", "true");
      res.setHeader(
        "Link",
        `<${process.env.GRAPHICS_API_BASE_URL ?? "http://127.0.0.1:8080"}/graphics/${encodeURIComponent(eventKey)}/live>; rel="successor-version"`,
      );
      res.status(200).json(state ?? defaultLiveGraphicState);
    } catch (error) {
      if (error instanceof RelayError) {
        res.status(error.status).json({
          error: "UPSTREAM_ERROR",
          code: "UPSTREAM_ERROR",
          message: error.message,
          retryable: error.retryable,
        });
        return;
      }
      const message =
        error instanceof Error
          ? error.message
          : "Graphics relay request failed";
      res.status(503).json({
        error: "UNAVAILABLE",
        code: "UNAVAILABLE",
        message,
        retryable: true,
      });
    }
  }

  app.post("/graphics/:eventKey/live/load/:timelineId", (req, res) => {
    const values =
      req.body && typeof req.body === "object" && req.body.values
        ? (req.body.values as Record<string, number>)
        : undefined;
    return relayCommand(res, req.params.eventKey, (room) =>
      room.load(req.params.eventKey, req.params.timelineId, true, values),
    );
  });

  app.post("/graphics/:eventKey/live/unload", (req, res) =>
    relayCommand(res, req.params.eventKey, (room) =>
      room.unload(req.params.eventKey, true),
    ),
  );

  app.post("/graphics/:eventKey/live/advance", (req, res) =>
    relayCommand(res, req.params.eventKey, (room) =>
      room.advance(req.params.eventKey, true),
    ),
  );

  app.post("/graphics/:eventKey/live/previous", (req, res) =>
    relayCommand(res, req.params.eventKey, (room) =>
      room.previous(req.params.eventKey, true),
    ),
  );

  app.post("/graphics/:eventKey/live/go/:index", (req, res) => {
    const index = Number.parseInt(req.params.index, 10);
    return relayCommand(res, req.params.eventKey, (room) =>
      room.go(req.params.eventKey, Number.isFinite(index) ? index : 0, true),
    );
  });

  app.post("/graphics/:eventKey/live/take", (req, res) =>
    relayCommand(res, req.params.eventKey, (room) =>
      room.take(req.params.eventKey, true),
    ),
  );

  app.post("/graphics/:eventKey/live/quick-take", (req, res) =>
    relayCommand(res, req.params.eventKey, (room) =>
      room.quickTake(req.params.eventKey, req.body?.spec, true),
    ),
  );

  app.post("/graphics/:eventKey/live/clear", (req, res) =>
    relayCommand(res, req.params.eventKey, (room) =>
      room.clear(req.params.eventKey, true),
    ),
  );

  app.post("/graphics/:eventKey/live/refresh/:destination", (req, res) => {
    const destination =
      req.params.destination === "program" ? "program" : "cue";
    return relayCommand(res, req.params.eventKey, (room) =>
      room.refresh(req.params.eventKey, destination, true),
    );
  });

  app.post("/graphics/:eventKey/live/push-update", (req, res) =>
    relayCommand(res, req.params.eventKey, (room) =>
      room.pushUpdate(req.params.eventKey, true),
    ),
  );

  /**
   * Asks every preview (PVW) screen on this event to replay its entrance
   * animation. Purely presentational: nothing durable changes and the program
   * bus is never touched (see `GraphicsPreviewReplay` in the models package).
   *
   * Unlike every other route here it does NOT go through `relayCommand` -
   * there is no API command to forward, so the relay broadcasts it directly
   * and answers with the payload it sent. GET is registered alongside POST for
   * the same reason the API's own playback routes do it: a Bitfocus Companion
   * button's simplest configuration is a body-less GET.
   */
  function replayPreview(
    req: express.Request<{ eventKey: string }>,
    res: express.Response,
  ): void {
    const room = getGraphicsRoom();
    if (!room) {
      res.status(503).json({
        error: "UNAVAILABLE",
        code: "UNAVAILABLE",
        message: "Graphics relay is unavailable",
        retryable: true,
      });
      return;
    }
    const payload = room.emitPreviewReplay(req.params.eventKey);
    res.status(200).json({ ok: true, ...payload });
  }

  app.post("/graphics/:eventKey/preview/replay", replayPreview);
  app.get("/graphics/:eventKey/preview/replay", replayPreview);

  app.post("/graphics/:eventKey/queue/next", (req, res) =>
    relayCommand(res, req.params.eventKey, (room) =>
      room.getState(req.params.eventKey, true),
    ),
  );

  app.post("/graphics/:eventKey/queue/go/:index", (req, res) => {
    const index = Number.parseInt(req.params.index, 10);
    return relayCommand(res, req.params.eventKey, (room) =>
      room.go(req.params.eventKey, Number.isFinite(index) ? index : 0, true),
    );
  });
} // isGraphicsDisabled

// Network variables
const host = getIPv4();

server.listen(
  {
    host,
    port: env.get().servicePort,
  },
  () => {
    logger.info(
      `[${env.get().nodeEnv.charAt(0).toUpperCase()}][${env
        .get()
        .serviceName.toUpperCase()}] Server started on ${host}:${
        env.get().servicePort
      }`,
    );
  },
);
