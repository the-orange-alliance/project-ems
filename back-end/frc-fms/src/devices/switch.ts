import log from "../logger.js";
import SSH2Promise from 'ssh2-promise';
import { Match, MatchParticipant } from "@toa-lib/models";
import { convertEMSStationToFMS } from "../helpers/generic.js";
import { SocketSupport } from "./socket.js";

const logger = log("switch")

export class SwitchSupport {
  private static _instance: SwitchSupport;

  private fmsIpAddress = "10.0.100.5";
  private switch: SwitchStatus = new SwitchStatus();

  private sshConn = new SSH2Promise({});
  private sshOpen = false;

  // Vlans
  private red1Vlan = 10;
  private red2Vlan = 20;
  private red3Vlan = 30;
  private blue1Vlan = 40;
  private blue2Vlan = 50;
  private blue3Vlan = 60;

  public static getInstance(): SwitchSupport {
    if (typeof SwitchSupport._instance === "undefined") {
      SwitchSupport._instance = new SwitchSupport();
    }
    return SwitchSupport._instance;
  }

  public setSettings(address: string, username: string, password: string) {
    this.switch.address = address;
    this.switch.username = username;
    this.switch.password = password;
    logger.info("✏ Updated Settings");
  }

  public async onPrestart(match: Match<any>) {
    // Configure Switch for Match
    await this.configTeamEthernet(match.participants ?? []);
    logger.info("✔ Prestarted")
  }

  private async configTeamEthernet(participants: MatchParticipant[]) {
    const oldConfig = await this.getTeamVlans();
    let infoString = 'ℹ Currently configured vlans |'
    for (const c of oldConfig) infoString += ` Vlan${c.vlan}: ${c.team} |`
    logger.info(infoString);
    let commands = [];
    let vlans = [this.red1Vlan, this.red2Vlan, this.red3Vlan, this.blue1Vlan, this.blue2Vlan, this.blue3Vlan];

    // Build Command to configure VLANs
    for (const p of participants) {
      const vlan = vlans[convertEMSStationToFMS(p.station)];

      // Locate current vlan config for this vlan
      const currVlanConfIndex = oldConfig.findIndex(e => e.vlan === vlan);

      if (oldConfig[currVlanConfIndex] && oldConfig[currVlanConfIndex].team === p.teamKey) {
        // This team exists on this Vlan already. No need to reconfigure anything.
      } else {
        /* New Team. Clear Vlan and Reconfig */

        // Remove Current Vlan Config
        commands.push(`interface Vlan${vlan}`);   // Select VLAN to Modify
        commands.push(`no ip address`);           // Clear Old IP
        commands.push(`no access-list 1${vlan}`); // Clear Access List

        // Setup DHCP pool for new Team
        commands.push(`ip dhcp excluded-address 10.${Math.floor(p.teamKey / 100)}.${p.teamKey % 100}.1 10.${Math.floor(p.teamKey / 100)}.${p.teamKey % 100}.100`);

        // Disable Old DHCP Pool
        commands.push(`no ip dhcp pool dhcp${vlan}`);

        // Enable New DHCP Pool
        commands.push(`ip dhcp pool dhcp${vlan}`);
        commands.push(`network 10.${Math.floor(p.teamKey / 100)}.${p.teamKey % 100}.0 255.255.255.0`);   // Setup IP Addresses
        commands.push(`default-router 10.${Math.floor(p.teamKey / 100)}.${p.teamKey % 100}.61`);         // Set Default Gateway
        commands.push(`lease 7`);                                                                       // Set DHCP Lease
        commands.push(`exit`);                                                                          // Exit DHCP conf

        // Disable/Clear Access-List
        commands.push(`no access-list 1${vlan}`);

        // Allow IP Addresses to communicate to FMS
        commands.push(`access-list 1${vlan} permit ip 10.${Math.floor(p.teamKey / 100)}.${p.teamKey % 100}.0 0.0.0.255 host ${this.fmsIpAddress}`);

        // Protocols to allow to communicate with FMS
        commands.push(`access-list 1${vlan} permit udp any eq bootpc any eq bootps`);

        // Set Default Vlan IP Address
        commands.push(`interface Vlan${vlan}`);                                                            // Select VLAN
        commands.push(`ip address 10.${Math.floor(p.teamKey / 100)}.${p.teamKey % 100}.61 255.255.255.0`);  // Set Switch's IP on Vlan
        commands.push(`exit`);                                                                             // Exit Vlan config
      }
    }
    const command = commands.join('\n')
    await this.runConfigCommand(command).then((res) => {
      SocketSupport.getInstance().switchReady();
      logger.info('✔ Updated field switch (' + this.switch.address + ') configuration')
      return this.getTeamVlans();
    }).then((newConf) => {
      // TODO: Use this info to ensure that switch config is correct
      let infoString = 'ℹ Newly configured vlans |'
      for (const c of newConf) infoString += ` Vlan${c.vlan}: ${c.team} |`
      logger.info(infoString);
    }).catch(error => {
      logger.error('❌ Failed to update field switch (' + this.switch.address + ') configuration')
    });
  }

  private async getTeamVlans(): Promise<TeamSwitchConfig[]> {
    let error = false;
    const data = await this.runCommand('show running-config').catch(() => { error = true; return "" });

    if (error) {
      logger.error('❌ Error reading switch config');
      return [];
    }

    const switchRegex = /interface Vlan(\d\d)\s+ip address 10.(\d+)\.(\d+).61/g;
    const vlans = [];
    let v;
    do {
      v = switchRegex.exec(data);
      if (v && v.length > 2) vlans.push([v[1], v[2], v[3]]);
    } while (v);
    if (vlans.length < 1) return [];

    // Store parsed vlans
    const parsedVlans: TeamSwitchConfig[] = [];

    // In theory vlan 100 should be read last and won't get done. otherwise we gotta check for that
    for (let i = 0; i < vlans.length && i < 7; i++) {
      const vConfig = vlans[i];
      const t = new TeamSwitchConfig();
      t.team100s = parseInt(vConfig[1]);
      t.team1s = parseInt(vConfig[2]);
      t.team = (parseInt(vConfig[1]) * 100) + parseInt(vConfig[2]);
      t.vlan = parseInt(vConfig[0]);
      parsedVlans.push(t);
    }
    return parsedVlans;

  }

  public runCommand(command: string, expectError: boolean = false): Promise<any> {
    return new Promise<any>(async (resolve, reject) => {
      // Start new connection if needed
      if (!this.sshConn || (this.sshConn && !this.sshOpen)) {
        this.sshConn = new SSH2Promise({ host: this.switch.address, username: this.switch.username, password: this.switch.password, algorithms: algorithms as any, reconnect: true, timeout: 7500 });
        await this.sshConn.connect().then(() => {
          logger.info('✔ Connected to Field Switch via SSH');
          this.sshOpen = true
          this.sshConn.on("disconnect", () => {
            logger.error(`❌ Lost connection to Field Switch (${this.switch.address}). Will retry connection when next command is sent.`);
            this.sshOpen = false;
          })
        }).catch((reason: any) => {
          logger.error('❌ Error SSHing into Field Switch (' + this.switch.address + '): ' + reason);
          reject(reason);
        });
      }
      this.sshConn.exec(command).then((data) => {
        resolve(data);
      }).catch((error: any) => {
        if (expectError) {
          resolve("");
        } else {
          if (error instanceof Buffer) error = error.toString();
          logger.error('❌ Error executing command on Field Switch: ' + error);
          reject(error)
        }
      });
    });
  }

  private runConfigCommand(command: string): Promise<string> {
    const commands = [];
    commands.push('config terminal');                     // Open Config Terminal
    commands.push(command);                               // Run Config Commands
    commands.push('end');                                 // Exit Config Terminal
    commands.push('copy running-config startup-config');  // Copy to Startup config
    commands.push('');                                    // Blank line to agree to filename
    commands.push('echo success');                        // Echo "success"
    return this.runCommand(commands.join('\n'), true);
  }

  // TODO: Create Telnet Command Queue so we don't break things by trying to do multiple SSHs at once
  // Future soren says thats too much work and it probably will never be an issue ;) (famous last words)
  // Even more future soren says we're using ssh now and this may still be but probably wont be an issue
}

const algorithms = {
  kex: [
    "diffie-hellman-group1-sha1",
    "ecdh-sha2-nistp256",
    "ecdh-sha2-nistp384",
    "ecdh-sha2-nistp521",
    "diffie-hellman-group-exchange-sha256",
    "diffie-hellman-group14-sha1"
  ],
  cipher: [
    "3des-cbc",
    "aes128-ctr",
    "aes192-ctr",
    "aes256-ctr",
    "aes128-gcm",
    "aes128-gcm@openssh.com",
    "aes256-gcm",
    "aes256-gcm@openssh.com"
  ],
  serverHostKey: [
    "ssh-rsa",
    "ecdsa-sha2-nistp256",
    "ecdsa-sha2-nistp384",
    "ecdsa-sha2-nistp521"
  ],
  hmac: [
    "hmac-sha2-256",
    "hmac-sha2-512",
    "hmac-sha1"
  ]
};

class SwitchStatus {
  public address: string;
  public username: string;
  public password: string;
  constructor() {
    this.address = '';
    this.username = '';
    this.password = '';
  }

}

class TeamSwitchConfig {
  public team100s: number;
  public team1s: number;
  public team: number;
  public vlan: number;
  constructor() {
    this.team100s = -1;
    this.team1s = -1;
    this.team = -1;
    this.vlan = -1;
  }

}
export default SwitchSupport.getInstance();
