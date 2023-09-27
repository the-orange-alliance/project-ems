import log from "../logger.js";
import { Socket } from "socket.io-client";
import { SocketOptions, createSocket } from "@toa-lib/client";
import { getToken } from "../helpers/ems.js";
import { getIPv4 } from "@toa-lib/server";
import { AvaliableHardware, DriverstationMonitor, DriverstationStatus, MatchKey, MatchSocketEvents, PrestartState, PrestartStatus } from "@toa-lib/models";
import { SettingsSupport } from "./settings.js";
import { EmsFrcFms } from "../server.js";

const logger = log("socket");

export class SocketSupport {
  private static _instance: SocketSupport;

  private _socket: Socket | null = null;

  private prestartStatus: PrestartStatus = {
    state: PrestartState.NotReady,
    matchKey: { eventKey: "", id: -1, tournamentKey: "" },
    hardware: []
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
    this.socket?.on(MatchSocketEvents.PRESTART, (matchKey: MatchKey) => {
      this.prestartStatus = {
        hardware: [],
        matchKey: matchKey,
        state: PrestartState.Prestarting
      }

      // Determine which hardware to add
      const settings = SettingsSupport.getInstance().settings;
      if (settings.enableFms) {
        this.prestartStatus.hardware.push({name: "Driverstation", state: PrestartState.Prestarting, lastLog: ""});
      }
      if (settings.enableAdvNet) {
        this.prestartStatus.hardware.push (
          {name: "Access Point", state: PrestartState.Prestarting, lastLog: ""},
          {name: "Field Switch", state: PrestartState.Prestarting, lastLog: ""},
        );
      }
      if (settings.enablePlc) {
        this.prestartStatus.hardware.push({name: "PLC", state: PrestartState.Prestarting, lastLog: ""});
      }
    });

    this.socket?.connect();
  }

  public dsUpdate(dses: DriverstationStatus[]) {
    // Update prestart statuses

    const payload: DriverstationMonitor = {
      dsStatuses: dses,
      activeTournament: SettingsSupport.getInstance().currentTournament ?? undefined,
      matchStatus: EmsFrcFms.getInstance().matchState,
      prestartStatus: this.prestartStatus
    }
    this.socket?.emit("frc-fms:ds-update", payload);
  }

  public updatePrestartState(name: AvaliableHardware, state: PrestartState, log?: string) {
    const hwIndex = this.prestartStatus.hardware.findIndex(hw => hw.name === name);
    // If we found the hardware
    if (hwIndex > -1) {
      this.prestartStatus.hardware[hwIndex].state = state;
      this.prestartStatus.hardware[hwIndex].lastLog = log ?? "";
    }
    // Calculate Overall Prestart State
    this.prestartStatus.state = this.prestartStatus.hardware.reduce((prev, curr) => (curr.state < prev.state ? curr : prev), {state: PrestartState.NotReady}).state;
    this.sendPrestartStatus();
  }

  public sendPrestartStatus() {
    this.socket?.emit('frc-fms:prestart-status', this.prestartStatus);
  }

  public settingsUpdateSuccess(who: { hwFingerprint: string }) {
    this.socket?.emit("frc-fms:settings-update-success", who);
  }

  // Methods to make this class easier to access
  public apSuccess() {
    this.updatePrestartState("Access Point", PrestartState.Success);
  }

  public apFail(reason: string) {
    this.updatePrestartState("Access Point", PrestartState.Fail, reason);
  }

  public apMessage(reason: string) {
    const currState = this.prestartStatus.hardware.find(hw => hw.name === "Access Point");
    if (currState) {
      this.updatePrestartState("Access Point", currState.state, reason);
    }
  }

  public switchSuccess() {
    this.updatePrestartState("Field Switch", PrestartState.Success);
  }

  public switchFail(reason: string) {
    this.updatePrestartState("Field Switch", PrestartState.Fail, reason);
  }

  public switchMessage(reason: string) {
    const currState = this.prestartStatus.hardware.find(hw => hw.name === "Field Switch");
    if (currState) {
      this.updatePrestartState("Field Switch", currState.state, reason);
    }
  }

  public dsSuccess() {
    this.updatePrestartState("Driverstation", PrestartState.Success);
  }

  public dsFail(reason: string) {
    this.updatePrestartState("Driverstation", PrestartState.Fail, reason);
  }

  public plcSuccess() {
    this.updatePrestartState("PLC", PrestartState.Success);
  }

  public plcFail(reason: string) {
    this.updatePrestartState("PLC", PrestartState.Fail, reason);
  }

  get socket(): Socket | null {
    return this._socket;
  }
}

export default SocketSupport.getInstance();
