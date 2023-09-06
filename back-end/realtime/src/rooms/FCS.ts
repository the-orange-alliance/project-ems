import { Server, Socket } from "socket.io";
import { FCS_ENDGAME, FCS_FIELD_FAULT, FCS_IDLE, FCS_INIT, FCS_MATCH_START, FieldControlUpdatePacket } from "@toa-lib/models";
import Room from "./Room.js";
import Match from "./Match.js";

export default class FCS extends Room {
  public constructor(server: Server, matchRoom: Match) {
    super(server, "fcs");

    matchRoom.localEmitter.on("match:start", () => {
      this.broadcast().emit("fcs:update", FCS_MATCH_START);
    });

    matchRoom.localEmitter.on("match:endgame", () => {
      this.broadcast().emit("fcs:update", FCS_ENDGAME);
    });

    matchRoom.localEmitter.on("match:end", () => {
      // TODO(Noah): Placeholder
      this.broadcast().emit("fcs:update", FCS_IDLE);
    });

    matchRoom.localEmitter.on("match:abort", () => {
      this.broadcast().emit("fcs:update", FCS_FIELD_FAULT);
    })
  }

  public initializeEvents(socket: Socket): void {
    socket.emit("fcs:init", FCS_INIT);

    socket.on("fcs:update", (update: FieldControlUpdatePacket) => {
      this.broadcast().emit("fcs:update", update);
    });
  }
}
