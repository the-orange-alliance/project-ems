import { Server, Socket } from "socket.io";
import { DriverstationStatus, PrestartStatus } from "@toa-lib/models"
import Room from "./Room.js";

type withEventKey = {eventKey: string}
type withFingerprint = {hwFingerprint: string}

export default class FRCFMS extends Room {
  public constructor(server: Server) {
    super(server, "frc-fms");
  }

  public initializeEvents(socket: Socket): void {
    socket.on("frc-fms:pong", (data: withEventKey) => {
      this.broadcast().emit("frc-fms:pong", data);
    });

    socket.on("frc-fms:settings-update", (data: withFingerprint) => {
      this.broadcast().emit("frc-fms:settings-update", data);
    });

    socket.on("frc-fms:settings-update-success", (data: withFingerprint) => {
      this.broadcast().emit("frc-fms:settings-update-success", data);
    });

    socket.on("frc-fms:prestart-status", (data: PrestartStatus) => {
      this.broadcast().emit("frc-fms:prestart-status", data);
    });

    socket.on("frc-fms:get-prestart-status", () => {
      this.broadcast().emit("frc-fms:get-prestart-status");
    });

    socket.on("frc-fms:ds-update", (data: DriverstationStatus[]) => {
      this.broadcast().emit("frc-fms:ds-update", data);
    });
  }
}
