import { Server, Socket } from "socket.io";
import { DriverstationStatus } from "@toa-lib/models"
import Room from "./Room.js";

type withEventKey = {eventKey: string}

export default class FRCFMS extends Room {
  public constructor(server: Server) {
    super(server, "frc-fms");
  }

  public initializeEvents(socket: Socket): void {
    socket.on("frc-fms:pong", (data: withEventKey) => {
      this.broadcast().emit("frc-fms:pong", data);
    });

    socket.on("frc-fms:settings-update", (data: withEventKey) => {
      this.broadcast().emit("frc-fms:settings-update", data);
    });

    socket.on("frc-fms:settings-update-success", (data: withEventKey) => {
      this.broadcast().emit("frc-fms:settings-update", data);
    });

    socket.on("frc-fms:ap-ready", (data: withEventKey) => {
      this.broadcast().emit("frc-fms:ap-ready", data);
    });

    socket.on("frc-fms:ds-ready", (data: withEventKey) => {
      this.broadcast().emit("frc-fms:ds-ready", data);
    });

    socket.on("frc-fms:switch-ready", (data: withEventKey) => {
      this.broadcast().emit("frc-fms:switch-ready", data);
    });

    socket.on("frc-fms:ds-update", (data: DriverstationStatus[]) => {
      this.broadcast().emit("frc-fms:ds-update", data);
    });
  }
}
