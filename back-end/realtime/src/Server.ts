import express, { Application, json } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { urlencoded } from "body-parser";
import jwt from "jsonwebtoken";
import { environment as env } from "@toa-lib/server";
import logger from "./util/Logger";
import { assignRooms, initRooms, leaveRooms } from "./rooms/Rooms";

// Setup our environment
env.loadAndSetDefaults();

// Bind socket.io to express to our http server
const app: Application = express();
const server = createServer(app);
const io = new Server(server);

// Config middleware
app.use(cors({ credentials: true }));
app.use(json());
app.use(urlencoded({ extended: false }));

io.use((socket, next) => {
  if (socket.handshake.query && socket.handshake.query.token) {
    jwt.verify(
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
  logger.info(`user '${user.username}' connected and verified`);

  socket.on("rooms", (rooms: string[]) => {
    logger.info(`user ${user.username} joining rooms ${rooms}`);
    assignRooms(rooms, socket);
  });

  socket.on("disconnect", (reason: string) => {
    logger.info(`user ${user.username} disconnected: ${reason}`);
    leaveRooms(socket);
  });

  socket.on("error", (err) => {
    logger.error({ err });
  });
});

initRooms(io);

server.listen(
  {
    host: env.get().serviceHost,
    port: env.get().servicePort,
  },
  () => {
    logger.info(
      `[${env.get().nodeEnv.charAt(0).toUpperCase()}][${env
        .get()
        .serviceName.toUpperCase()}] Server started on ${
        env.get().serviceHost
      }:${env.get().servicePort}`
    );
  }
);
