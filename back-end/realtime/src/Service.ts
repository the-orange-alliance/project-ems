import express, { Application, json } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { urlencoded } from "body-parser";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JWTStrategy, ExtractJwt } from "passport-jwt";
import jwt from "jsonwebtoken";

const app: Application = express();
const server = createServer(app);
const io = new Server(server);

// Config middleware
app.use(cors({ credentials: true }));
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(passport.initialize());

passport.serializeUser((user, cb) => {
  console.log("serialize user", user);
  cb(null, (user as any).id);
});

passport.deserializeUser((id, cb) => {
  console.log("deserialize user", id);
  cb(null, { id: 0, user: "admin" });
});

io.use((socket, next) => {
  if (socket.handshake.query && socket.handshake.query.token) {
    jwt.verify(
      socket.handshake.query.token.toString(),
      "changeit",
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
  console.log("user connected", (socket as any).decoded);

  socket.on("fcs:update", (update) => {
    console.log("updating field", update);
    socket.broadcast.emit("fcs:update", update);
  });

  socket.on("disconnect", () => {
    console.log("user disonnected");
  });
});

server.listen(3000, () => console.log("server started"));
