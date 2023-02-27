import log from "../logger.js";
import { Socket } from "socket.io-client";
import { SocketOptions, createSocket } from "@toa-lib/client";
import { getToken } from "../helpers/ems.js";
import { getIPv4 } from "@toa-lib/server";
import { FMSSettings } from "@toa-lib/models";

const logger = log("socket");

export class SocketSupport {
  private static _instance: SocketSupport;

  private _socket: Socket | null = null;

  public static getInstance(): SocketSupport {
    if (typeof SocketSupport._instance === "undefined") {
      SocketSupport._instance = new SocketSupport();
    }
    return SocketSupport._instance;
  }

  public async initSocket() {
    const token = await getToken();
    SocketOptions.host = getIPv4();
    SocketOptions.port = 8081;
    // @ts-ignore
    this._socket = createSocket(token);
    if (token) logger.info("✔ Successfully recieved token from EMS");
    else logger.info("❌ Failed to get key from FMS. Things won't work!");
    // Setup Socket Connect/Disconnect
    this.socket?.on("connect", () => {
      logger.info("✔ Connected to EMS through SocketIO.");
      this.socket?.emit("rooms", ["match", "fcs", "frc-fms"]);
    });
    this.socket?.on("disconnect", () => {
      logger.error("❌ Disconnected from SocketIO.");
    });
    this.socket?.on("error", () => {
      logger.error("❌ Error With SocketIO, not connected to EMS");
    });
    this.socket?.on("frc-fms:ping", () => {
      this.socket?.emit("frc-fms:pong");
    });

    this.socket?.connect();
  }

  public switchReady() {
    this.socket?.emit('frc-fms:switch-ready');
  }

  public dsReady() {
    this.socket?.emit("frc-fms:ds-ready");
  }

  public apReady() {
    this.socket?.emit('frc-fms:ap-ready')
  }

  public settingsUpdateSuccess(settings: FMSSettings) {
    this.socket?.emit("frc-fms:settings-update-success", settings);
  }

  get socket(): Socket | null {
    return this._socket;
  }
}

export default SocketSupport.getInstance();
