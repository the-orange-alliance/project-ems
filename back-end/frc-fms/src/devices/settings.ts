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
    await this.updateSettings(true);

    // Listen for settings updates
    SocketSupport.getInstance().socket?.on("frc-fms:settings-update", (who: { hwFingerprint: string }) => {
      // If the settings update is for us, update our settings
      if (who.hwFingerprint === hwFingerprint) {
        logger.info("🛰 Recieved request to update settings")
        this.updateSettings();
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
      remoteSettings[0].hwFingerprint !== hwFingerprint
    ) {
      // Log
      logger.info('✔ No Settings Found. Running with defaults.')
      // Post our settings
      await postAdvNetCfg(this.settings);
    } else {
      this._settings = remoteSettings[0];
      logger.info(`✔ Fetched previous settings from EMS. FMS Enabled? ${!!this.settings.enableFms} Advanced Networking enabled? ${!!this.settings.enableAdvNet} PLC Enabled? ${!!this.settings.enablePlc}`)
      // Post back settings with updated timestamp
      this.settings.registeredAt = new Date().toISOString();
      await postAdvNetCfg(this.settings);
    }

    // This should never change
    this._settings.hwFingerprint = hwFingerprint;

    // Get the Event Data
    this._assignedEvent = await getEvent(this.settings.eventKey);
    this._tournaments = await getTournaments(this.settings.eventKey);

    if (!initial) {
      EmsFrcFms.getInstance().stopServices();
    }

    // If Advanced networking is enabled
    if (this.settings.enableAdvNet) {

      // Update AP Settings
      AccesspointSupport.getInstance().setSettings(
        this.settings.apIp,
        this.settings.apUsername,
        this.settings.apPassword,
        this.settings.apTeamCh,
        this.settings.apAdminCh,
        this.settings.apAdminSsid,
        this.settings.apAdminWpa,
        this.settings.enableAdvNet,
        [],
        false
      );

      // Update Switch Settings
      SwitchSupport.getInstance().setSettings(
        this.settings.switchIp,
        this.settings.switchUsername,
        this.settings.switchPassword
      );

      // Update Admin Wifi configuration
      await AccesspointSupport.getInstance().configAdminWifi();

      // Update PLC Settings
      if (this.settings.enablePlc) {
        // Initilize
        await PlcSupport.getInstance().initPlc(this.settings.plcIp);

        // If this isn't initial startup, flash updated settings pattern
        if (!initial) {
          PlcSupport.getInstance().stopNoSettingsInterval();
          await PlcSupport.getInstance().flashUpdatedSettings();
        }

        // If we have no event, start flash pattern on field stack
        if (!this.settings.eventKey || this.settings.eventKey === "" || this.settings.fieldNumber < 0) {
          PlcSupport.getInstance().startNoSettingsInterval();
        }
      }
    }

    // If this isn't first boot
    if (!initial) {
      // Restart main loops
      EmsFrcFms.getInstance().startServices();

      // Emit settings update success
      SocketSupport.getInstance().settingsUpdateSuccess(hwFingerprint);
    }

    logger.info("✏ Finished Updating Settings");
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

  get hwFingerprint() {
    return hwFingerprint;
  }
}

export default SettingsSupport.getInstance();
