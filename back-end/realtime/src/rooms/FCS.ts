import { Server, Socket } from "socket.io";
import { FieldControlPacket } from "@toa-lib/models";
import Room from "./Room";
import logger from "../util/Logger";

export default class FCS extends Room {
  public constructor(server: Server) {
    super(server, "fcs");
  }

  public initializeEvents(socket: Socket): void {
    socket.on("fcs:update", (update: FieldControlPacket) => {
      this.broadcast().emit("fcs:update", update);
      logger.info('fcs:update called, emitting');
    });
  }
}
