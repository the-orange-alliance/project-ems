import log from "../logger.js";
import { FMSSettings, getDefaultFMSSettings, MatchKey, Tournament, Event } from "@toa-lib/models";
import { SocketSupport } from "./socket.js";
import { AccesspointSupport } from "./accesspoint.js";
import { SwitchSupport } from "./switch.js";
import { PlcSupport } from "./plc.js";
import { EmsFrcFms } from "../server.js";
import { getAdvNetCfg, getEvent, getTournaments, postAdvNetCfg } from "../helpers/ems.js";

// @ts-ignore No Types :(
import { getFingerprint } from "hw-fingerprint";

// getFingerprint() returns a Buffer
const hwFingerprint = getFingerprint().toString("hex");
const logger = log("settings");

export class SettingsSupport {
  private static _instance: SettingsSupport;

  private _settings: FMSSettings = getDefaultFMSSettings(hwFingerprint);
  private _assignedEvent: Event | null = null;
  private _tournaments: Tournament[] = [];
  private _activeTournament?: Tournament | null = null;

  public static getInstance(): SettingsSupport {
    if (typeof SettingsSupport._instance === "undefined") {
      SettingsSupport._instance = new SettingsSupport();
    }
    return SettingsSupport._instance;
  }

  public async initSettings() {
    await this.updateSettings();

    // Listen for settings updates
    SocketSupport.getInstance().socket?.on("frc-fms:settings-update", (who: { hwFingerprint: string }) => {
      // If the settings update is for us, update our settings
      if (who.hwFingerprint === hwFingerprint) {
        this.updateSettings(true);
      }
    });
  }


  private async updateSettings(initial: boolean = false) {
    // Get new settings
    const remoteSettings = await getAdvNetCfg(hwFingerprint);

    // Not our config, we won't accept it
    if (
      !Array.isArray(remoteSettings) ||
      remoteSettings.length === 0 ||
      remoteSettings[0].hwFingerprint !== hwFingerprint) {
      // Post our settings
      await postAdvNetCfg(this.settings);
    } else {
      this._settings = remoteSettings[0];
      // Post back settings with updated timestamp
      this.settings.registeredAt = new Date().toISOString();
      await postAdvNetCfg(this.settings);
    }

    // This should never change
    this._settings.hwFingerprint = hwFingerprint;

    // Get the Event Data
    this._assignedEvent = await getEvent(this.settings.eventKey);
    this._tournaments = await getTournaments(this.settings.eventKey);

    // If Advanced networking is enabled
    if (this.settings.enableAdvNet) {

      // Update AP Settings
      AccesspointSupport.getInstance().setSettings(
        this.settings.apIp,
        this.settings.apUsername,
        this.settings.apPassword,
        this.settings.apTeamCh,
        this.settings.apAdminCh,
        this.settings.apAdminWpa,
        this.settings.enableAdvNet,
        [],
        false
      );

      // Update Switch Settings
      SwitchSupport.getInstance().setSettings(
        this.settings.switchIp,
        "cisco",
        this.settings.switchPassword
      );

      // Update PLC Settings
      if (this.settings.enablePlc) {
        await PlcSupport.getInstance().initPlc(this.settings.plcIp);
        // If we have no event, start flash pattern on field stack
        if (!this.settings.eventKey || this.settings.eventKey === "") {
          PlcSupport.getInstance().startNoSettingsInterval();
        } else {
          PlcSupport.getInstance().stopNoSettingsInterval();
          PlcSupport.getInstance().flashUpdatedSettings();
        }
      }
    }

    // If this isn't first boot
    if (!initial) {
      // Restart main loops
      EmsFrcFms.getInstance().restartLoops();

      // Emit settings update success
      SocketSupport.getInstance().settingsUpdateSuccess(hwFingerprint);
    }

    logger.info("✔ Updated Settings!");
  }

  // Things to do upon prestart
  public async onPrestart(matchKey: MatchKey) {
    if (!this._tournaments || this._tournaments.length === 0) {
      // Get tournaments
      this._tournaments = await getTournaments(this.settings.eventKey);
    }

    // Find the tournament
    this._activeTournament = this._tournaments.find((t) => t.tournamentKey === matchKey.tournamentKey);

    // If we can't find the tournament, fetch it again and try to locate it again
    if (!this._activeTournament) {
      this._tournaments = await getTournaments(this.settings.eventKey);
      this._activeTournament = this._tournaments.find((t) => t.tournamentKey === matchKey.tournamentKey);
    }
  }

  // Read-only properties

  get settings() {
    return this._settings;
  }

  get currentEvent() {
    return this._assignedEvent;
  }

  get currentTournament() {
    return this._activeTournament;
  }

  get allTournaments() {
    return this._tournaments;
  }
}

export default SettingsSupport.getInstance();
