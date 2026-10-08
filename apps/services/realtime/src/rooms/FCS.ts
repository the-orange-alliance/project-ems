import { dirname } from "path";
import { Server, Socket } from "socket.io";
import { fileURLToPath } from "url";
import Room from "./Room.js";
import logger from "../util/Logger.js";
import {
  EcoEquilibriumFCS,
  MatchSocketEvent,
  FGC25FCS,
  FcsConnectionEvents,
  FcsConnectionStatus,
  FcsFieldClient,
  FcsIdentifyPacket,
  getOfflineDevices,
} from "@toa-lib/models";

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

export default class FCS extends Room {
  // Sockets that have identified themselves as field hardware, keyed by socket id
  private fieldClients: Map<string, FcsFieldClient> = new Map();

  public constructor(server: Server) {
    super(server, "fcs");
  }

  private getConnectionStatus(): FcsConnectionStatus {
    const fields = [...this.fieldClients.values()].sort(
      (a, b) => (a.field ?? Infinity) - (b.field ?? Infinity),
    );
    return { connected: fields.length > 0, fields };
  }

  private broadcastConnectionStatus(): void {
    this.broadcast().emit(
      FcsConnectionEvents.Connection,
      this.getConnectionStatus(),
    );
  }

  public initializeEvents(socket: Socket): void {
    // Emit init and status packets when a client connects
    socket.emit("fcs:init"); // TODO: send actual init data
    socket.emit(FcsConnectionEvents.Connection, this.getConnectionStatus());

    // Field hardware announces itself so other clients can tell it's online.
    // It re-sends this whenever one of its devices (e.g. WLEDs) changes state.
    socket.on(
      FcsConnectionEvents.Identify,
      (data?: FcsIdentifyPacket): void => {
        const field = typeof data?.field === "number" ? data.field : null;
        const devices: Record<string, boolean> = {};
        for (const [name, ok] of Object.entries(data?.devices ?? {})) {
          devices[name] = ok === true;
        }
        const client = { field, devices };
        const isNew = !this.fieldClients.has(socket.id);
        const offline = getOfflineDevices(client);
        logger.info(
          `${FcsConnectionEvents.Identify} field ${field ?? "unknown"} (${socket.handshake.address})` +
            (offline.length ? ` offline devices: ${offline.join(", ")}` : ""),
        );
        this.fieldClients.set(socket.id, client);
        if (isNew) {
          socket.once("disconnect", (): void => {
            logger.info(`fcs field ${field ?? "unknown"} disconnected`);
            this.fieldClients.delete(socket.id);
            this.broadcastConnectionStatus();
          });
        }
        this.broadcastConnectionStatus();
      },
    );

    socket.on(FcsConnectionEvents.GetConnection, (): void => {
      socket.emit(FcsConnectionEvents.Connection, this.getConnectionStatus());
    });

    socket.on("fcs:prepareField", (): void => {
      logger.info("fcs:prepareField");
      this.broadcast().emit("fcs:prepareField");
    });

    socket.on("fcs:allClear", (): void => {
      logger.info("fcs:allClear");
      this.broadcast().emit("fcs:allClear");
    });

    socket.on("fcs:awardsMode", (): void => {
      logger.info("fcs:awardsMode");
      this.broadcast().emit("fcs:awardsMode");
    });

    socket.on(
      "fcs:settings",
      ({ field, data }: { field: number; data: any }): void => {
        logger.info("fcs:settings", field, data);
        socket.to("fcs").emit("fcs:settings", { field, data });
      },
    );

    socket.on("fcs:status", (data: FGC25FCS.FcsStatus): void => {
      // logger.info("fcs:status", data);
      socket.to("fcs").emit("fcs:status", data);
    });

    socket.on("fcs:clearStatus", (): void => {
      logger.info("fcs:clearStatus");
      socket.to("fcs").emit("fcs:clearStatus");
    });

    // Season-Specific
    socket.on(
      EcoEquilibriumFCS.SocketEvents.EcosystemUpdate,
      (data: EcoEquilibriumFCS.EcosystemUpdate): void => {
        // logger.info("fcs:ecosystemUpdate", data);
        this.server
          .to("match")
          .emit(EcoEquilibriumFCS.SocketEvents.EcosystemUpdate, data);
      },
    );

    socket.on(
      EcoEquilibriumFCS.SocketEvents.AccelerationUpdate,
      (data: EcoEquilibriumFCS.AcceleratorUpdate): void => {
        // logger.info("fcs:accelerationUpdate", data);
        this.server
          .to("match")
          .emit(EcoEquilibriumFCS.SocketEvents.AccelerationUpdate, data);
      },
    );

    socket.on("fcs:ropeDrop", (): void => {
      // logger.info("fcs:ropeDrop");
      socket.to("fcs").emit("fcs:ropeDrop");
    });

    socket.on(
      EcoEquilibriumFCS.SocketEvents.BiodiversityDispensedUpdate,
      (data: EcoEquilibriumFCS.DispenserUpdate): void => {
        // logger.info("fcs:biodiversityDispensedUpdate", data);
        this.server
          .to("match")
          .emit(
            EcoEquilibriumFCS.SocketEvents.BiodiversityDispensedUpdate,
            data,
          );
      },
    );
  }
}
