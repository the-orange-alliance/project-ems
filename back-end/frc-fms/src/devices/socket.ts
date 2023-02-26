import log from "../logger.js";
import { Socket } from "socket.io-client";
import { SocketOptions } from "@toa-lib/client";
import { getToken } from "../helpers/ems.js";
import FMSSettings from "../models/FMSSettings.js";
import { createSocket } from "@toa-lib/client";

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
    SocketOptions.host = "10.0.100.5";
    SocketOptions.port = 8081;
    // @ts-ignore
    this._socket = createSocket(token);
    if (token) logger.info("✔ Successfully recieved token from EMS");
    else logger.info("❌ Failed to get key from FMS. Things won't work!");
    // Setup Socket Connect/Disconnect
    this.socket?.on("connect", () => {
      logger.info("✔ Connected to EMS through SocketIO.");
      this.socket?.emit("rooms", ["match", "fcs"]);
    });
    this.socket?.on("disconnect", () => {
      logger.error("❌ Disconnected from SocketIO.");
    });
    this.socket?.on("error", () => {
      logger.error("❌ Error With SocketIO, not connected to EMS");
    });
    this.socket?.on("fms-ping", () => {
      this.socket?.emit("fms-pong");
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
    this.socket?.emit("frc-fms:settings-update-success", JSON.stringify(settings.toJson()));
  }

  get socket(): Socket | null {
    return this._socket;
  }
}

export default SocketSupport.getInstance();
