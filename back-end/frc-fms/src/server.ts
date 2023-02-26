import logger from "./logger.js";
import { DriverstationSupport } from "./driverstation-support.js";
import { AccesspointSupport } from "./accesspoint-support.js";
import { SwitchSupport } from "./switch-support.js";
import { PlcSupport } from "./plc-support.js";
import {
  Match,
  MatchTimer,
  Event,
  MatchMode,
  MatchParticipant,
  MatchKey,
} from "@toa-lib/models";
import { Socket } from "socket.io-client";
import { getMatch, getToken } from "./helpers/ems.js";
import { createSocket, SocketOptions } from "@toa-lib/client";
import { environment } from "@toa-lib/server";

/* Load our environment variables. The .env file is not included in the repository.
 * Only TOA staff/collaborators will have access to their own, specialized version of
 * the .env file.
 */

const ipRegex =
  /\b(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\b/;

let host = environment.get().serviceHost || "127.0.0.1";
let udpTcpListenerIp = "10.0.100.5";

if (process.argv[2] && process.argv[2].match(ipRegex)) {
  host = process.argv[2];
}

export class EmsFrcFms {
  private static _instance: EmsFrcFms;
  public _timer: MatchTimer = new MatchTimer();
  public activeMatch: Match<any> | null;
  public timeLeft: number = 0;
  public matchState: number = 0;
  public event: Event;
  private dsInterval: any;
  private apInterval: any;
  private plcInterval: any;
  private socket: Socket | null = null;
  private settings: FMSSettings = new FMSSettings();
  public matchStateMap: Map<String, number> = new Map<String, number>([
    ["prestart", 0],
    ["timeout", 1],
    ["post-timeout", 2],
    ["start-match", 3],
    ["auto", 4],
    ["transition", 5],
    ["tele", 5],
  ]);

  private delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  constructor() {
    this.activeMatch = {} as any;
    this.event = {} as any;
    // Attempt to Authenticate to EMS and then init FMS=
    this.attemptInit();
  }

  public static getInstance(): EmsFrcFms {
    if (typeof EmsFrcFms._instance === "undefined") {
      EmsFrcFms._instance = new EmsFrcFms();
    }
    return EmsFrcFms._instance;
  }

  private async attemptInit() {
    let isInit = false;
    let initializeCount = 1;
    while (!isInit) {
      await this.initFms()
        .then(() => {
          isInit = true;
        })
        .catch(async (err) => {
          logger.error(
            "❌ Failed to initialize FMS after " +
              initializeCount +
              " tries. Make sure API and Socket are running. Error: " +
              err
          );
          initializeCount++;
          await this.delay(5000);
        });
    }
  }

  public async initFms() {
    // Init EMS
    await this.initSocket();

    // Load Settings from EMS DB
    await this.loadSettings();

    // Init DriverStation listeners
    DriverstationSupport.getInstance().dsInit(udpTcpListenerIp);

    // Init AccessPoint Settings to default
    if (this.settings.enableAdvNet)
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

    // Init Switch Configuration Tools
    if (this.settings.enableAdvNet)
      SwitchSupport.getInstance().setSettings(
        this.settings.switchIp,
        "cisco",
        this.settings.switchPassword
      );

    // Init Timer
    this._timer = new MatchTimer();
    this.initTimer();
    this.timeLeft = this._timer.timeLeft;

    // Start FMS Services Updates
    this.startDriverStation();
    if (this.settings.enableAdvNet) {
      clearInterval(this.apInterval);
      this.startAPLoop();
    }
    if (this.settings.enableAdvNet && this.settings.enablePlc) {
      await PlcSupport.getInstance().initPlc(this.settings.plcIp);
      clearInterval(this.plcInterval);
      this.startPLC();
    }
    // The Switch manager doesn't have a loop, it runs on prestart.
  }

  private async loadSettings() {
    // TODO: This will come through socket
    // const events = await EMSProvider.getEvent();
    const events: any[] = [];
    if (events && events.length > 0) {
      this.event = events[0];
      // TODO: Config
      // const config = await EMSProvider.getAdvNetConfig(this.event.eventKey);
      const config: any = {};
      if (!config.error) {
        this.settings = new FMSSettings().fromJson(config);
        logger.info(
          "✔ Loaded Settings for FMS with event " + this.event.eventKey
        );
      } else {
        // await EMSProvider.postAdvNetConfig(this.event.eventKey, this.settings.toJson());
        logger.info(
          "❗ No FMS configuration found for " +
            this.event.eventKey +
            ". Running with default settings."
        );
      }
    } else {
      logger.info("✔ No event found. Running with default settings.");
    }
  }

  private async updateSettings(newSettings: object) {
    this.settings = new FMSSettings().fromJson(newSettings);
    // Update AP Settings
    if (this.settings.enableAdvNet) {
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
      clearInterval(this.apInterval);
      this.startAPLoop();
    } else {
      clearInterval(this.apInterval);
    }
    // Update Switch Settings
    if (this.settings.enableAdvNet)
      SwitchSupport.getInstance().setSettings(
        this.settings.switchIp,
        "cisco",
        this.settings.switchPassword
      );
    // Update PLC Settings
    if (this.settings.enableAdvNet && this.settings.enablePlc) {
      await PlcSupport.getInstance().initPlc(this.settings.plcIp);
      clearInterval(this.plcInterval);
      this.startPLC();
    } else {
      clearInterval(this.plcInterval);
    }
    logger.info("✔ Updated Settings!");
  }

  private async initSocket() {
    const token = await getToken();
    SocketOptions.host = "10.0.100.5";
    SocketOptions.port = 8081;
    // @ts-ignore
    this.socket = createSocket(token);
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
    this.socket?.on("fms-settings-update", (data: string) => {
      this.updateSettings(JSON.parse(data));
      this.socket?.emit(
        "fms-settings-update-success",
        JSON.stringify(this.settings.toJson())
      );
    });

    // Manage Socket Events
    this.socket?.on("match:prestart", (matchKey: MatchKey) => {
      logger.info("🔁 Prestart Command Issued");
      this.matchState = MatchMode.PRESTART;
      this.fmsOnPrestart(matchKey);
    });

    this.socket?.connect();

    // Update all instances
    DriverstationSupport.getInstance().setSocket(this.socket);
    AccesspointSupport.getInstance().setSocket(this.socket);
    PlcSupport.getInstance().setSocket(this.socket);
    SwitchSupport.getInstance().setSocket(this.socket);
  }

  private async fmsOnPrestart(matchKey: MatchKey) {
    this.activeMatch = await this.getMatch(matchKey).catch((err) => {
      logger.error("❌ Error getting participant information: " + err);
      return null;
    });

    if (!this.activeMatch) {
      logger.error("❌ Received prestart command, but found no active match");
      return;
    }

    // Call DriverStation Prestart
    DriverstationSupport.getInstance().onPrestart(this.activeMatch);
    if (this.settings.enableAdvNet) {
      // Configure AP
      AccesspointSupport.getInstance().handleTeamWifiConfig(
        this.activeMatch.eventKey,
        this.activeMatch.participants ?? []
      );
      // Configure Switch
      SwitchSupport.getInstance().configTeamEthernet(this.activeMatch.participants ?? []);
    }
    if (this.settings.enableAdvNet && this.settings.enablePlc) {
      // Set Field Lights
      PlcSupport.getInstance().onPrestart();
    }
  }

  private initTimer() {
    this.socket?.on("match:start", () => {
      // this._timer.matchConfig = timerConfig;
      // Signal DriverStation Start
      DriverstationSupport.getInstance().driverStationMatchStart();
      this._timer.on("timer:auto", () => {
        this.matchState = MatchMode.AUTONOMOUS;
        logger.info("▶ Autonomous");
      });
      this._timer.on("timer:transition", () => {
        this.matchState = MatchMode.TRANSITION;
        logger.info("▶ Transistion");
      });
      this._timer.on("timer:tele", () => {
        this.matchState = MatchMode.TELEOPERATED;
        logger.info("▶ Teleoperated");
      });
      this._timer.on("timer:endgame", () => {
        this.matchState = MatchMode.ENDGAME;
        logger.info("▶ Endgame");
      });
      this._timer.on("timer:end", () => {
        this.removeMatchlisteners();
        this.matchState = MatchMode.ENDED;
        logger.info("⏹ Local Timer Ended");
      });

      logger.info("▶ Match Started");
      this._timer.start();
      this.matchState = MatchMode.AUTONOMOUS;
      this.timeLeft = this._timer.timeLeft;
      const timerID = global.setInterval(() => {
        this.timeLeft = this._timer.timeLeft;
        if (this._timer.timeLeft <= 0) {
          this.timeLeft = this._timer.timeLeft;
          global.clearInterval(timerID);
        }
      }, 1000);
    });
    this.socket?.on("match:end", () => {
      this._timer.stop();
      this.timeLeft = this._timer.timeLeft;
      this.matchState = MatchMode.ENDED;
      this.removeMatchlisteners();
      logger.info("⏹ Remote Timer Ended");
    });
    this.socket?.on("match:abort", () => {
      this._timer.abort();
      this.timeLeft = this._timer.timeLeft;
      this.matchState = MatchMode.ABORTED;
      this.removeMatchlisteners();
      logger.info("🛑 Match Aborted");
    });
  }

  private removeMatchlisteners() {
    this._timer.removeAllListeners("timer:auto");
    this._timer.removeAllListeners("timer:transition");
    this._timer.removeAllListeners("timer:tele");
    this._timer.removeAllListeners("timer:endgame");
    this._timer.removeAllListeners("timer:end");
  }

  private startDriverStation() {
    this.dsInterval = setInterval(() => {
      DriverstationSupport.getInstance().runDriverStations();
    }, 500);
    logger.info("✔ Driver Station Manager Init Complete, Running Loop");
  }

  private startPLC() {
    this.plcInterval = setInterval(() => {
      PlcSupport.getInstance().runPlc();
    }, 100);
    logger.info("✔ PLC Manager Init Complete, Running Loop");
  }

  private startAPLoop() {
    this.apInterval = setInterval(async () => {
      await AccesspointSupport.getInstance().runAp();
    }, 3000);
    logger.info("✔ Access Point Manager Init Complete, Running Loop");
  }

  private getMatch(prestartData: MatchKey): Promise<Match<any>> {
    return new Promise<Match<any>>((resolve, reject) => {
      getMatch(prestartData)
        .then((match: Match<any>) => {
          resolve(match);
        })
        .catch((err) => {
          logger.error("❌ Error getting match: " + err);
          reject(null);
        });
    });
  }
}

class FMSSettings {
  public enableFms: boolean;
  public enableAdvNet: boolean;
  public apIp: string;
  public apUsername: string;
  public apPassword: string;
  public apTeamCh: string;
  public apAdminCh: string;
  public apAdminWpa: string;
  public switchIp: string;
  public switchPassword: string;
  public enablePlc: boolean;
  public plcIp: string;

  constructor() {
    this.enableFms = true;
    this.enableAdvNet = true;
    this.apIp = "10.0.100.3";
    this.apUsername = "root";
    this.apPassword = "1234Five";
    this.apTeamCh = "157";
    this.apAdminCh = "-1";
    this.apAdminWpa = "1234Five";
    this.switchIp = "10.0.100.2";
    this.switchPassword = "1234Five";
    this.enablePlc = true;
    this.plcIp = "10.0.100.40";
  }
  public fromJson(json: any): this {
    this.enableFms = json.enable_fms;
    this.enableAdvNet = json.enable_adv_net;
    this.apIp = json.ap_ip;
    this.apUsername = json.ap_username;
    this.apPassword = json.ap_password;
    this.apTeamCh = json.ap_team_ch;
    this.apAdminCh = json.ap_admin_ch;
    this.apAdminWpa = json.ap_admin_wpa;
    this.switchIp = json.switch_ip;
    this.switchPassword = json.switch_password;
    this.enablePlc = json.enable_plc;
    this.plcIp = json.plc_ip;
    return this;
  }

  public toJson(): object {
    return {
      enable_fms: this.enableFms,
      enable_adv_net: this.enableAdvNet,
      ap_ip: this.apIp,
      ap_username: this.apUsername,
      ap_password: this.apPassword,
      ap_team_ch: this.apTeamCh,
      ap_admin_ch: this.apAdminCh,
      ap_admin_wpa: this.apAdminWpa,
      switch_ip: this.switchIp,
      switch_password: this.switchPassword,
      enable_plc: this.enablePlc,
      plc_ip: this.plcIp,
    };
  }
}

export default EmsFrcFms.getInstance();
