import log from "../logger.js";
import { EmsFrcFms } from "../server.js";
import SSH2Promise from 'ssh2-promise';
import { Match, MatchMode, MatchParticipant, MatchState } from "@toa-lib/models";
import { getWpaKeys } from "../helpers/ems.js";
import { SocketSupport } from "./socket.js";
import { sleep } from "../helpers/generic.js";
import { Socket } from "socket.io-client";

const logger = log("ap")

const loggerError = (msg: any) => {
  logger.error(msg);
  SocketSupport.getInstance().apMessage(msg);
}

// Regexes
const ssidRegEx = /ESSID: "([-\w ]*)"/;
const linkQualityRegex = /Link Quality: ([-\w ]+)\/([-\w ]+)/;
const signalRegex = /Signal: ([-\w ]+) /;

export class AccesspointSupport {
  private static _instance: AccesspointSupport;
  private accessPointSshPort: number = 22;
  private accessPointConnectTimeoutSec: number = 1;
  private accessPointCommandTimeoutSec: number = 5;
  private accessPointPollPeriodSec: number = 3;
  private accessPointRequestBufferSize: number = 10;
  private accessPointConfigRetryIntervalSec: number = 5;

  private ap: AccessPoint = new AccessPoint();
  private sshConn = new SSH2Promise({});
  private sshOpen = false;
  private teamWifiStatuses: TeamWifiStatus[] = [];

  private processLock = false;
  private inError = false;

  public static getInstance(): AccesspointSupport {
    if (typeof AccesspointSupport._instance === "undefined") {
      AccesspointSupport._instance = new AccesspointSupport();
    }
    return AccesspointSupport._instance;
  }

  public setSettings(address: string, username: string, password: string, teamChannel: string, adminChannel: string, adminSsid: string, adminWpaKey: string, networkSecurityEnabled: boolean, TeamWifiStatuses: TeamWifiStatus[], initialStatusesFetched: boolean) {
    this.ap.address = address;
    this.ap.username = username;
    this.ap.password = password;
    this.ap.teamChannel = teamChannel;
    this.ap.adminChannel = adminChannel;
    this.ap.adminWpaKey = adminWpaKey;
    this.ap.adminSsid = adminSsid;
    this.ap.networkSecurityEnabled = networkSecurityEnabled;
    logger.info("✏ Updated Settings")
  }

  // Run everything
  public async runAp() {
    // Process lock
    if (this.processLock) return;
    this.processLock = true;

    await this.updateTeamWifiStatus()
      .then(() => {
        if (this.inError) {
          logger.info(`✔ Routine Access Point status update succeeded after previous error`);
          this.inError = false;
        }
      }).catch(e => {
        logger.error(`❌ Routine AP (${this.ap.address}) status update failed: ${e}`);
        this.inError = true;
      });

    // Process unlock
    this.processLock = false;
  }

  // Configure the Admin Wifi
  public async configAdminWifi() {
    if (!this.ap.networkSecurityEnabled) return;
    const disabled = (parseInt(this.ap.adminChannel) < 1) ? 1 : 0;
    const commands = [
      `set wireless.radio0.channel='${this.ap.teamChannel}'`,
      `set wireless.radio1.disabled='${disabled}'`,
      `set wireless.radio1.channel='${this.ap.adminChannel}'`,
      `set wireless.@wifi-iface[0].ssid=${this.ap.adminSsid}`,
      `set wireless.@wifi-iface[0].key='${this.ap.adminWpaKey}'`,
      `commit wireless`
    ];
    let configCommand = commands.join('\n');
    const fullCommand = `uci batch <<ENDCONFIG && wifi radio1\n${configCommand}\nENDCONFIG\n`;
    await this.runCommand(fullCommand)
      .then(() => logger.info("✔ Updated admin wifi configuration"))
      .catch(() => loggerError("❌ Failed to update admin wifi configuration"))
  }

  // Things to do on prestart
  public async onPrestart(match: Match<any>) {
    EmsFrcFms.getInstance().stopAp();
    const rsp = await this.handleTeamWifiConfig(match.eventKey, match.participants ?? []);
    if (rsp.length === 0) {
      SocketSupport.getInstance().apSuccess();
      EmsFrcFms.getInstance().startAPLoop();
      logger.info("✔ Prestarted")
    } else {
      SocketSupport.getInstance().apFail(rsp);
      logger.error("❌ Failed to Prestart")
    }
  }

  public kill() {
    this.sshConn.close();
    this.sshOpen = false;
  }

  /**
   * Runs on prestart, attempt to configure field AP for a match
   * @param eventKey Event key to program for
   * @param participants Participants to program for
   * @returns String if error, empty string if successful
   */
  private async handleTeamWifiConfig(eventKey: string, participants: MatchParticipant[]): Promise<string> {
    // Check if this feature is enabled
    if (!this.ap.networkSecurityEnabled) return "";

    // Fetch config from radio
    await this.updateTeamWifiStatus();

    // Check AP config
    if (await this.checkTeamConfig(participants)) {
      logger.info('✔ Current radios correct');
      return "";
    }

    // Get WPA Keys and init teamWifiStatuses
    // TODO: Cache these somewhere so we don't have to query the DB every time
    const wpaKeys = await getWpaKeys(eventKey);
    for (const p of participants) {
      const tws: TeamWifiStatus = {
        teamId: p.teamKey,
        wpaKey: wpaKeys.find(e => e.teamKey === p.teamKey)?.wpaKey ?? '99999999',
        linked: false,
        quality: ['unknown', '70'],
        signal: 'unknown'
      };
      if (p.station === 11) this.teamWifiStatuses[0] = tws;
      else if (p.station === 12) this.teamWifiStatuses[1] = tws;
      else if (p.station === 13) this.teamWifiStatuses[2] = tws;
      else if (p.station === 21) this.teamWifiStatuses[3] = tws;
      else if (p.station === 22) this.teamWifiStatuses[4] = tws;
      else if (p.station === 23) this.teamWifiStatuses[5] = tws;
    }

    // Generate Config Command
    const configCommand = this.generateApConfigForMatch(participants);
    if (!configCommand || configCommand.length < 1) {
      loggerError('❌ Failed to generate a config for the AP');
      return "Failed to generate a config for the AP";
    }
    const fullCommand = `uci batch <<ENDCONFIG && wifi radio0\n${configCommand}\nENDCONFIG\n`;

    let attemptCount = 1;
    while (attemptCount < 6) {
      let error = false;
      // Run command and wait for response
      await this.runCommand(fullCommand).catch(e => {
        loggerError(`❌ Error configuring wifi: ${e}`);
        error = true;
      });
      // Wait before reading the config back on write success as it doesn't take effect right away, or before retrying on failure.
      await sleep(this.accessPointConfigRetryIntervalSec * 1000);
      if (!error) {
        // Update Team Statuses
        await this.updateTeamWifiStatus().catch(() => { });

        // Check again
        if (await this.checkTeamConfig(participants)) {
          logger.info('✔ Successfully configured Wifi after ' + attemptCount + ' attempt(s).');
          return "";
        }
      }
      // There was an error of some kind and the config is not correct
      loggerError(`❌ WiFi configuration still incorrect after ${attemptCount} attempt(s); trying again.`);
      SocketSupport.getInstance().apMessage(`WiFi configuration still incorrect after ${attemptCount} attempt(s); trying again.`);
      attemptCount++;
    }

    return `❌ Failed to configure wifi after ${attemptCount} attempts.`;
  }

  // Returns true if the configured networks as read from the access point match the given teams.
  public async checkTeamConfig(participants: MatchParticipant[]): Promise<boolean> {
    // If there is no active match, this will fail. All of this will fail, actially
    if (!EmsFrcFms.getInstance().activeMatch) return false;

    // Fetch data from AP
    const data = await this.runCommand("iwinfo").catch(() => "");

    // Split it up
    const split = data.split("wlan");
    // Remove first and last
    split.splice(0, 1);
    split.pop();
    // Attempt to extract SSID from AP
    const ssids = split.map(r => parseInt((new RegExp(ssidRegEx, "g").exec(r) ?? ["", "-1"])[1]));

    // Print
    logger.info(`ℹ Currently configured radios: (${ssids.join(" | ")})`);
    // Check each participant against what we have in the AP
    for (const i in participants) {
      const p = participants[i];
      const w = ssids[i];
      if (!w || !p) return false
      if (p && w && w !== p.teamKey) return false;
    }
    // If we get here, then the radios are all correct!
    return true;
  }

  // Fetches the current wifi network status from the access point and updates the status structure.
  public async updateTeamWifiStatus(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!this.ap.networkSecurityEnabled) return resolve();

      // Check that we're ready
      if (!this.teamWifiStatuses || this.teamWifiStatuses.length < 1) return resolve();

      // Don't worry about statuses if match isn't in progress
      const state = EmsFrcFms.getInstance().matchState;
      if (state < MatchMode.PRESTART || state >= MatchMode.ENDED) return;

      let error: any = false;
      const data = await this.runCommand("iwinfo").catch(e => { error = e });

      if (error || !data || typeof data !== "string" || data.length === 0) {
        logger.error('❌ Couldn\'t get Wifi Status from AP (' + this.ap.address + '): ' + error);
        reject(error);
      } else if (this.decodeWifiConfig(data)) {
        resolve();
      } else {
        reject(`Couldn't decode Wifi Status from AP (${this.ap.address})`);
      }
    })
  }

  // Logs into the access point via SSH and runs the given shell command.
  public runCommand(command: string): Promise<string> {
    return new Promise<any>(async (resolve, reject) => {
      // Start new connection if needed
      if (!this.sshConn || (this.sshConn && !this.sshOpen)) {
        this.sshConn = new SSH2Promise({ host: this.ap.address, username: this.ap.username, password: this.ap.password });
        await this.sshConn.connect().then(() => {
          logger.info(`✔ Connected to Access Point at ${this.ap.address}:22`);
          this.sshOpen = true
          this.sshConn.on("disconnect", () => {
            logger.error(`❌ Lost connection to Access Point (${this.ap.address}:22). Will retry connection when next command is sent.`);
            this.sshOpen = false;
          })
        }).catch((reason: any) => {
          logger.error(`'❌ Error SSHing into Access Point (${this.ap.address}:22): ${reason}`);
          reject(reason);
        });
      }
      this.sshConn.exec(command).then((data) => {
        resolve(data);
      }).catch((error: any) => {
        if (error instanceof Buffer) error = error.toString();
        logger.error('❌ Error executing command on AP: ' + error);
        reject(error)
      });
    });
  }

  // Verifies WPA key validity and runs the configuration command the active match's teams.
  public generateApConfigForMatch(pars: MatchParticipant[]): string {
    const commands = [];
    for (let i = 0; i < this.teamWifiStatuses.length; i++) {
      const pos = i + 1;
      if (!pars[i] || !pars[i].teamKey || pars[i].teamKey < 1) {
        commands.push(`set wireless.@wifi-iface[${pos}].disabled='0'`);
        commands.push(`set wireless.@wifi-iface[${pos}].ssid='no-team-${pos}'`);
        commands.push(`set wireless.@wifi-iface[${pos}].key='no-team-${pos}'`);
      } else {
        if (this.teamWifiStatuses[i].wpaKey.length < 8 || this.teamWifiStatuses[i].wpaKey.length > 63) {
          logger.info(`❌ Invalid WPA key '${this.teamWifiStatuses[i].wpaKey}' configured for team ${pars[i].teamKey}.`);
          return '';
        }
        commands.push(`set wireless.@wifi-iface[${pos}].disabled='0'`);
        commands.push(`set wireless.@wifi-iface[${pos}].ssid='${pars[i].teamKey}'`);
        commands.push(`set wireless.@wifi-iface[${pos}].key='${this.teamWifiStatuses[i].wpaKey}'`);
      }
    }
    commands.push("commit wireless");
    return commands.join('\n');
  }

  // Parses the given output from the "iwinfo" command on the AP and updates the given status structure with the result.
  public decodeWifiConfig(wifiInfo: string): boolean {
    // Exit if we have no Wifi Configs
    if (!this.teamWifiStatuses || this.teamWifiStatuses.length < 1) return false;

    // Split on interfaces
    const interfaces = wifiInfo.split('wlan');

    // Remove first (blank) interface
    interfaces.splice(0, 1);

    // Remove last (2.4ghz) interface
    interfaces.pop();

    for (let intf of interfaces) {
      // Execute regexes
      const parsedSsid = new RegExp(ssidRegEx, "g").exec(intf);
      const parsedQuality = new RegExp(linkQualityRegex, "g").exec(intf);
      const parsedSignal = new RegExp(signalRegex, "g").exec(intf);

      // Team ID
      const teamId = parsedSsid ? parseInt(parsedSsid[1]) : -1

      // Find index
      const index = this.teamWifiStatuses.findIndex(t => t.teamId === teamId);

      if (index > -1 && !isNaN(teamId) && teamId > -1) {
        this.teamWifiStatuses[index].quality = parsedQuality ? [parsedQuality[1], parsedQuality[2]] : ['unknown', '70'];
        this.teamWifiStatuses[index].signal = parsedSignal ? parsedSignal[1] : 'unknown';
        this.teamWifiStatuses[index].linked = !!(parsedQuality && parsedQuality[1] !== 'unknown');
      } else if (index === -1 && !isNaN(teamId) && teamId > -1) {
        logger.warn(`⚠ Fetched AP status from non-active team #${teamId}, ignoring`)
      } else {
        logger.warn(`⚠ Unable to deciper or locate status object for team #${teamId}. Ensure they're in the active match and try again`)
      }
    }

    if (interfaces.length < 6) {
      // worlds longest log message
      logger.error(`❌ Could not parse wifi info; expected 6 interfaces, got ${interfaces.length}. Parsed what we could`);
      return false;
    }

    return true;
  }

  get teamStatuses(): TeamWifiStatus[] {
    return this.teamWifiStatuses;
  }
}

class AccessPoint {
  public address: string;
  public username: string;
  public password: string;
  public teamChannel: string;
  public adminChannel: string;
  public adminSsid: string;
  public adminWpaKey: string;
  public networkSecurityEnabled: boolean;

  constructor() {
    this.address = '';
    this.username = '';
    this.password = '';
    this.teamChannel = '157';
    this.adminChannel = '-1';
    this.adminSsid = 'EMS'
    this.adminWpaKey = '';
    this.networkSecurityEnabled = true;
  }

}


interface TeamWifiStatus {
  teamId: number,
  linked: boolean,
  signal: string,
  quality: string[],
  wpaKey: string
}
export default AccesspointSupport.getInstance();
