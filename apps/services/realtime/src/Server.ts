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
import { RelayError } from "./rooms/Graphics.js";
import {
  playbackStateEnvelopeZod,
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

// Graphics serves authoritative reads and off-air preview replay only.
if (!isGraphicsDisabled()) {
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
   * Asks every preview (PVW) screen on this event to replay its entrance
   * animation. Purely presentational: nothing durable changes and the program
   * bus is never touched (see `GraphicsPreviewReplay` in the models package).
   *
   * There is no durable command to forward, so realtime broadcasts it directly
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
