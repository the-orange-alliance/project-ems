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
  getOfflineDevices,
  parseFcsStatusClient,
} from "@toa-lib/models";

const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

// A field that hasn't reported status in this long is shown as disconnected.
// Fields report every second, so this also catches dropped networks well
// before the socket itself times out.
const FIELD_STATUS_TIMEOUT_MS = 5000;

interface TrackedField {
  client: FcsFieldClient;
  timeout: NodeJS.Timeout;
}

export default class FCS extends Room {
  // Sockets that are reporting fcs:status, keyed by socket id
  private fieldClients: Map<string, TrackedField> = new Map();

  public constructor(server: Server) {
    super(server, "fcs");
  }

  private getConnectionStatus(): FcsConnectionStatus {
    const fields = [...this.fieldClients.values()]
      .map(({ client }) => client)
      .sort((a, b) => (a.field ?? Infinity) - (b.field ?? Infinity));
    return { connected: fields.length > 0, fields };
  }

  private broadcastConnectionStatus(): void {
    this.broadcast().emit(
      FcsConnectionEvents.Connection,
      this.getConnectionStatus(),
    );
  }

  private removeField(socket: Socket, reason: string): void {
    const tracked = this.fieldClients.get(socket.id);
    if (!tracked) return;
    clearTimeout(tracked.timeout);
    this.fieldClients.delete(socket.id);
    logger.info(`fcs field ${tracked.client.field ?? "unknown"} ${reason}`);
    this.broadcastConnectionStatus();
  }

  /**
   * Marks the socket as a connected field. Fields report every second, so
   * this only broadcasts when the field or its device states change.
   */
  private trackField(socket: Socket, status: unknown): void {
    const client = parseFcsStatusClient(status);
    const existing = this.fieldClients.get(socket.id);
    if (existing) {
      clearTimeout(existing.timeout);
    } else {
      socket.once("disconnect", () => this.removeField(socket, "disconnected"));
    }
    const timeout = setTimeout(
      () => this.removeField(socket, "stopped reporting status"),
      FIELD_STATUS_TIMEOUT_MS,
    );
    this.fieldClients.set(socket.id, { client, timeout });

    if (
      existing &&
      JSON.stringify(existing.client) === JSON.stringify(client)
    ) {
      return;
    }
    const offline = getOfflineDevices(client);
    logger.info(
      `fcs field ${client.field ?? "unknown"} reporting (${socket.handshake.address})` +
        (offline.length ? ` offline devices: ${offline.join(", ")}` : ""),
    );
    this.broadcastConnectionStatus();
  }

  public initializeEvents(socket: Socket): void {
    // Emit init and status packets when a client connects
    socket.emit("fcs:init"); // TODO: send actual init data
    socket.emit(FcsConnectionEvents.Connection, this.getConnectionStatus());

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
      // Connection tracking must never break the status relay
      try {
        this.trackField(socket, data);
      } catch (e) {
        logger.error(`fcs: failed to track field status: ${e}`);
      }
    });

    // data is { field } from the event monitor; fields clear only their own
    // status, or all fields if no field number is given
    socket.on("fcs:clearStatus", (data?: { field?: number }): void => {
      logger.info("fcs:clearStatus", data);
      socket.to("fcs").emit("fcs:clearStatus", data);
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
