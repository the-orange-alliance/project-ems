import log from "../logger.js";
import { Socket } from "socket.io-client";
import { SocketOptions, createSocket } from "@toa-lib/client";
import { getToken } from "../helpers/ems.js";
import { getIPv4 } from "@toa-lib/server";
import { FMSSettings, MatchKey, PrestartStatus } from "@toa-lib/models";

const logger = log("socket");

export class SocketSupport {
  private static _instance: SocketSupport;

  private _socket: Socket | null = null;

  private prestartStatus: PrestartStatus = {
    apReady: false,
    dsReady: false,
    switchReady: false,
    matchKey: {eventKey: "", id: -1, tournamentKey: ""},
    prestartComplete: false
  };

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

    // Get current prestart status
    this.socket?.on("frc-fms:get-prestart-status", () => {
      this.sendPrestartStatus();
    });

    // Setup Prestart
    this.socket?.on("match:prestart", (matchKey: MatchKey) => {
      this.prestartStatus = {
        apReady: false,
        dsReady: false,
        switchReady: false,
        matchKey: matchKey,
        prestartComplete: false
      }
    });

    this.socket?.connect();
  }

  public switchReady() {
    this.prestartStatus.switchReady = true;
    this.sendPrestartStatus();
  }

  public dsReady() {
    this.prestartStatus.dsReady = true;
    this.sendPrestartStatus();
  }

  public apReady() {
    this.prestartStatus.apReady = true;
    this.sendPrestartStatus();
  }

  public sendPrestartStatus() {
    this.socket?.emit('frc-fms:prestart-status', this.prestartStatus);
  }

  public settingsUpdateSuccess(who: {hwFingerprint: string}) {
    this.socket?.emit("frc-fms:settings-update-success", who);
  }

  get socket(): Socket | null {
    return this._socket;
  }
}

export default SocketSupport.getInstance();
