import express, { Application, json } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import parser from "body-parser";
import jwt from "jsonwebtoken";
import { environment as env, getIPv4 } from "@toa-lib/server";
import logger from "./util/Logger.js";
import { assignRooms, initRooms, leaveRooms } from "./rooms/Rooms.js";

// Setup our environment
env.loadAndSetDefaults(process.env);

// Bind socket.io to express to our http server
const app: Application = express();
const server = createServer(app);
const io = new Server(server);

// Config middleware
app.use(cors({ credentials: true }));
app.use(json());
app.use(parser.urlencoded({ extended: false }));

io.use((socket, next) => {
  (socket as any).decoded = { id: 0, username: 'Bypassed', permissions: '*' };
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
      }
    );
  } else {
    next(new Error("Authentication Error: no query token present"));
  }
});

io.on("connection", (socket) => {
  const user = (socket as any).decoded;
  logger.info(
    `user '${user.username}' (${socket.handshake.address}) connected and verified`
  );

  socket.on("identify", async (data: any) => {
    try {
      // Add things
      data.lastSocketId = socket.id;
      data.ipAddress = socket.handshake.address;

      // Send back IP and socket id
      socket.emit("identify-response", data);
    } catch (e) {
      console.log('Failed to negotiate sockets settings', e);
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
      console.log('Failed to update socket client', e);
    }
  });

  socket.on("identify-client", async (data: any) => {
    // Find socket
    const socketToIdentify = io.sockets.sockets.get(data.lastSocketId);
    // Emit message
    socketToIdentify?.emit("identify-client", data);
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
      console.log('Failed to identify all clients', e);
    }
  })

  socket.on("rooms", (rooms: unknown) => {
    if (Array.isArray(rooms) && rooms.every(room => typeof room === "string")) {
      logger.info(
        `user ${user.username} (${socket.handshake.address}) joining rooms ${rooms}`
      );
      assignRooms(rooms, socket);
    } else {
      logger.warn(
        `user ${user.username} (${socket.handshake.address}) sent "rooms" event with invalid payload: ${rooms}`
      );
    }
  });

  socket.on("disconnect", (reason: string) => {
    logger.info(
      `user ${user.username} (${socket.handshake.address}) disconnected: ${reason}`
    );
    leaveRooms(socket);
  });

  socket.on("error", (err) => {
    logger.error({ err });
  });
});

initRooms(io);

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
        .serviceName.toUpperCase()}] Server started on ${host}:${env.get().servicePort
      }`
    );
  }
);
