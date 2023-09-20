import { Server, Socket } from "socket.io";
import {
  FCS_ENDGAME,
  FCS_FIELD_FAULT,
  FCS_INIT,
  FCS_SOLID_ALLIANCE_COLORS,
  FCS_TURN_OFF_LIGHTS,
  FieldControlUpdatePacket
} from "@toa-lib/models";
import Room from "./Room.js";
import Match from "./Match.js";

export default class FCS extends Room {
  private readonly latestFcsStatus: FieldControlUpdatePacket = { hubs: {} };

  public constructor(server: Server, matchRoom: Match) {
    super(server, "fcs");

    matchRoom.localEmitter.on("match:start", () => {
      this.broadcastFcsUpdate(FCS_TURN_OFF_LIGHTS);
    });

    matchRoom.localEmitter.on("match:tele", () => {
      this.broadcastFcsUpdate(FCS_SOLID_ALLIANCE_COLORS);
    });

    matchRoom.localEmitter.on("match:endgame", () => {
      this.broadcastFcsUpdate(FCS_ENDGAME);
    });

    matchRoom.localEmitter.on("match:end", () => {
      this.broadcastFcsUpdate(FCS_SOLID_ALLIANCE_COLORS);
    });

    matchRoom.localEmitter.on("match:abort", () => {
      this.broadcastFcsUpdate(FCS_FIELD_FAULT);
    })
  }

  public initializeEvents(socket: Socket): void {
    socket.emit("fcs:init", FCS_INIT);

    socket.on("fcs:update", (update: FieldControlUpdatePacket) => {
      this.broadcastFcsUpdate(update);
    });

    socket.emit("fcs:update", this.latestFcsStatus);
  }

  private broadcastFcsUpdate(update: FieldControlUpdatePacket): void {
    this.broadcast().emit("fcs:update", update);

    // Update this.latestFcsStatus AFTER sending out the new update
    for (const hubNumber in update.hubs) {
      const hubFromThisUpdate = update.hubs[hubNumber];

      let latestFcsStatusHub = this.latestFcsStatus.hubs[hubNumber];
      if (!latestFcsStatusHub) {
        latestFcsStatusHub = {};
        this.latestFcsStatus.hubs[hubNumber] = latestFcsStatusHub;
      }

      const servosFromThisUpdate = hubFromThisUpdate.servos;
      const motorsFromThisUpdate = hubFromThisUpdate.motors;
      const digitalInputsFromThisUpdate = hubFromThisUpdate.digitalInputs;

      if (servosFromThisUpdate) {
        for (const newServoParams of servosFromThisUpdate) {
          // Remove any parameters from this.latestFcsStatus that are intended for the same servo as newServoParams.
          latestFcsStatusHub.servos = latestFcsStatusHub.servos?.filter(
            oldServoParams => oldServoParams.port != newServoParams.port) ?? [];

          latestFcsStatusHub.servos!.push(newServoParams)
        }
      }

      if (motorsFromThisUpdate) {
        for (const newMotorParams of motorsFromThisUpdate) {
          // Remove any parameters from this.latestFcsStatus that are intended for the same motor as newMotorParams.
          latestFcsStatusHub.motors = latestFcsStatusHub.motors?.filter(
            oldMotorParams => oldMotorParams.port != newMotorParams.port) ?? [];

          latestFcsStatusHub.motors!.push(newMotorParams)
        }
      }

      if (digitalInputsFromThisUpdate) {
        for (const newDigitalInputParams of digitalInputsFromThisUpdate) {
          // Remove any parameters from this.latestFcsStatus that are intended for the same channel as newDigitalInputParams.
          latestFcsStatusHub.digitalInputs = latestFcsStatusHub.digitalInputs?.filter(
            oldDigitalInputParams => oldDigitalInputParams.channel != newDigitalInputParams.channel) ?? [];

          latestFcsStatusHub.digitalInputs!.push(newDigitalInputParams)
        }
      }
    }
  }
}
