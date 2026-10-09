import express, { Application, json } from "express";
import { createServer } from "http";
import { Server, Socket } from "socket.io";
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
import { playbackStateEnvelopeZod } from "@toa-lib/models";
import { join } from "path";
import {
  PlaybackPublicationReceiver,
  registerPlaybackPublicationBodyParser,
  registerPlaybackPublicationEndpoint,
  resolvePlaybackPublicationLimitBytes,
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

// The authoritative playback envelope routinely exceeds express's 100 KB json()
// default, so the publication route gets its own, larger, parser - mounted
// HERE, ahead of the global one, because body-parser skips a request an earlier
// parser already read. Every other route keeps the 100 KB default.
const playbackPublicationLimitBytes = resolvePlaybackPublicationLimitBytes();
if (!isGraphicsDisabled())
  registerPlaybackPublicationBodyParser(app, playbackPublicationLimitBytes);

app.use(json());
app.use(parser.urlencoded({ extended: false }));

// Human-readable explanations for socket.io disconnect reasons.
const DISCONNECT_REASONS: Record<string, string> = {
  "io server disconnect": "server forcibly disconnected the socket",
  "io client disconnect": "client manually disconnected",
  "server namespace disconnect": "server disconnected the namespace",
  "client namespace disconnect": "client left the namespace",
  "ping timeout":
    "client stopped responding to pings (network loss or frozen client)",
  "transport close":
    "connection was closed (client closed tab/app or lost network)",
  "transport error": "connection encountered an error",
  "parse error": "server received an invalid packet from the client",
  "forced close": "connection was forcibly closed",
  "forced server close": "server closed the connection during upgrade",
  "server shutting down": "server is shutting down",
};

// Reasons that are an expected, intentional disconnect.
const EXPECTED_DISCONNECT_REASONS = new Set([
  "io server disconnect",
  "io client disconnect",
  "server namespace disconnect",
  "client namespace disconnect",
  "server shutting down",
]);

function normalizeAddress(address: string | undefined): string {
  if (!address) return "unknown";
  return address.startsWith("::ffff:") ? address.substring(7) : address;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value.join(", ");
  return value;
}

function formatError(err: unknown): string {
  if (err instanceof Error) {
    const ctx = (err as any).context
      ? ` context=${safeStringify((err as any).context)}`
      : "";
    const code =
      (err as any).code !== undefined ? ` code=${(err as any).code}` : "";
    return `${err.name}: ${err.message}${code}${ctx}`;
  }
  if (err === undefined || err === null) return "none";
  return typeof err === "string" ? err : safeStringify(err);
}

function safeStringify(value: unknown): string {
  try {
    const str = JSON.stringify(value);
    return str === undefined ? String(value) : str;
  } catch {
    return String(value);
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Builds a consistent identifier string for a socket, used in every log line. */
function describeSocket(socket: Socket): string {
  const user = (socket as any).decoded;
  const ip = normalizeAddress(socket.handshake.address);
  const forwarded =
    headerValue(socket.handshake.headers["x-forwarded-for"]) ??
    headerValue(socket.handshake.headers["x-real-ip"]);
  const transport = socket.conn?.transport?.name ?? "unknown";
  const username =
    user?.username !== undefined
      ? normalizeAddress(String(user.username))
      : "unknown";
  return `[user='${username}' id=${socket.id} ip=${ip}${
    forwarded ? ` fwd=${forwarded}` : ""
  } transport=${transport}]`;
}

/** Describes the target socket of a relay message, by its lastSocketId. */
function describeTarget(lastSocketId: unknown): string {
  const target =
    typeof lastSocketId === "string"
      ? io.sockets.sockets.get(lastSocketId)
      : undefined;
  return target
    ? describeSocket(target)
    : `[id=${String(lastSocketId)} (not connected)]`;
}

// Low-level engine errors (handshake failures, bad requests, CORS, etc.)
io.engine.on("connection_error", (err: any) => {
  const req = err?.req;
  const ip = normalizeAddress(req?.socket?.remoteAddress);
  const forwarded = headerValue(req?.headers?.["x-forwarded-for"]);
  logger.warn(
    `engine connection error from ip=${ip}${forwarded ? ` fwd=${forwarded}` : ""} url=${
      req?.url ?? "unknown"
    } ua='${req?.headers?.["user-agent"] ?? "unknown"}': code=${err?.code} message=${
      err?.message
    }${err?.context ? ` context=${safeStringify(err.context)}` : ""}`,
  );
});

io.use((socket, next) => {
  logger.debug(
    `handshake from id=${socket.id} ip=${normalizeAddress(
      socket.handshake.address,
    )} ua='${socket.handshake.headers["user-agent"] ?? "unknown"}'`,
  );
  (socket as any).decoded = {
    id: 0,
    username: socket.handshake.address,
    permissions: "*",
  };
  return next();

  // Disable auth for now
  if (socket.handshake.query && socket.handshake.query.token) {
    jwt.verify(
      // @ts-ignore
      socket.handshake.query.token.toString(),
      env.get().jwtSecret,
      (err, decoded) => {
        if (err) {
          logger.warn(
            `authentication failed for id=${socket.id} ip=${normalizeAddress(
              socket.handshake.address,
            )}: ${formatError(err)}`,
          );
          return next(new Error("Authentication Error"));
        } else {
          (socket as any).decoded = decoded;
          next();
        }
      },
    );
  } else {
    logger.warn(
      `authentication failed for id=${socket.id} ip=${normalizeAddress(
        socket.handshake.address,
      )}: no query token present`,
    );
    next(new Error("Authentication Error: no query token present"));
  }
});

io.on("connection", (socket) => {
  const connectedAt = Date.now();
  const who = () => describeSocket(socket);

  logger.info(
    `${who()} connected and verified (ua='${
      socket.handshake.headers["user-agent"] ?? "unknown"
    }', origin=${socket.handshake.headers.origin ?? "none"}, total clients=${
      io.engine.clientsCount
    })`,
  );

  socket.conn.once("upgrade", () => {
    logger.debug(
      `${who()} upgraded transport to ${socket.conn.transport.name}`,
    );
  });

  socket.on("identify", async (data: any) => {
    try {
      // Add things
      data.lastSocketId = socket.id;
      data.ipAddress = socket.handshake.address;

      logger.info(
        `${who()} identified (ipAddress=${data.ipAddress}${data.persistantClientId ? ` clientId=${data.persistantClientId}` : ""})`,
      );

      // Send back IP and socket id
      socket.emit("identify-response", data);
    } catch (e) {
      logger.error(
        `${who()} failed to negotiate socket settings: ${formatError(e)}`,
      );
    }
  });

  socket.on("update-socket-client", async (data: any) => {
    // Update socket client
    try {
      // Locate socket by lastSocketId
      const socketToUpdate = io.sockets.sockets.get(data?.lastSocketId);
      if (!socketToUpdate) {
        logger.warn(
          `${who()} requested settings update for ${describeTarget(
            data?.lastSocketId,
          )}, but target socket was not found`,
        );
        return;
      }
      logger.info(
        `${who()} pushing settings update to ${describeSocket(socketToUpdate)}`,
      );
      // Update socket
      socketToUpdate.emit("settings", data);
    } catch (e) {
      logger.error(
        `${who()} failed to update socket client: ${formatError(e)}`,
      );
    }
  });

  socket.on("identify-client", async (data: any) => {
    // Find socket
    const socketToIdentify = io.sockets.sockets.get(data?.lastSocketId);
    if (!socketToIdentify) {
      logger.warn(
        `${who()} requested identify for ${describeTarget(
          data?.lastSocketId,
        )}, but target socket was not found`,
      );
      return;
    }
    logger.info(
      `${who()} requested identify for ${describeSocket(socketToIdentify)}`,
    );
    // Emit message
    socketToIdentify.emit("identify-client", data);
  });

  socket.on("refresh-client", async (data: any) => {
    // Find socket
    const socketToIdentify = io.sockets.sockets.get(data?.lastSocketId);
    if (!socketToIdentify) {
      logger.warn(
        `${who()} requested refresh for ${describeTarget(
          data?.lastSocketId,
        )}, but target socket was not found`,
      );
      return;
    }
    logger.info(
      `${who()} requested refresh for ${describeSocket(socketToIdentify)}`,
    );
    // Emit message
    socketToIdentify.emit("refresh-client", data);
  });

  socket.on("identify-all-clients", async (data) => {
    try {
      // Get all devices from api
      const { clients } = data;
      let found = 0;
      const missing: string[] = [];
      // Iterate over devices
      clients.forEach((client: any) => {
        // Find socket
        const socketToIdentify = io.sockets.sockets.get(client.lastSocketId);
        if (socketToIdentify) {
          found++;
          // Emit message
          socketToIdentify.emit("identify-client", client);
        } else {
          missing.push(String(client.lastSocketId));
        }
      });
      logger.info(
        `${who()} requested identify for all clients: ${found}/${clients.length} notified${
          missing.length ? ` (not connected: ${missing.join(", ")})` : ""
        }`,
      );
    } catch (e) {
      logger.error(
        `${who()} failed to identify all clients: ${formatError(e)}`,
      );
    }
  });

  socket.on("rooms", (rooms: unknown) => {
    if (
      Array.isArray(rooms) &&
      rooms.every((room) => typeof room === "string")
    ) {
      logger.info(`${who()} joining rooms [${rooms.join(", ")}]`);
      assignRooms(rooms, socket);
    } else {
      logger.warn(
        `${who()} sent "rooms" event with invalid payload: ${safeStringify(rooms)}`,
      );
    }
  });

  socket.on("disconnecting", (reason: string) => {
    const rooms = [...socket.rooms].filter((room) => room !== socket.id);
    logger.debug(
      `${who()} disconnecting (${reason}), leaving rooms [${rooms.join(", ")}]`,
    );
  });

  socket.on("disconnect", (reason: string, description?: unknown) => {
    const explanation = DISCONNECT_REASONS[reason] ?? "unknown reason";
    const message = `${who()} disconnected after ${formatDuration(
      Date.now() - connectedAt,
    )}: reason='${reason}' (${explanation})${
      description !== undefined ? `, details: ${formatError(description)}` : ""
    }, remaining clients=${io.engine.clientsCount}`;
    if (EXPECTED_DISCONNECT_REASONS.has(reason)) {
      logger.info(message);
    } else {
      logger.warn(message);
    }
    try {
      leaveRooms(socket);
    } catch (e) {
      logger.error(
        `${who()} failed to leave rooms on disconnect: ${formatError(e)}`,
      );
    }
  });

  socket.on("error", (err) => {
    logger.error(`${who()} socket error: ${formatError(err)}`);
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
    playbackPublicationLimitBytes,
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
