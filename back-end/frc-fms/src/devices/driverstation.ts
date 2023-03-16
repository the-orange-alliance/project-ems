import * as dgram from "dgram";
import * as net from "net";
import DSConn from "../models/DSConn.js";
import log from "../logger.js";
import { EmsFrcFms } from "../server.js";
import {
  PlcSupport
} from "./plc.js";
import { DriverstationStatus, FINALS_LEVEL, Match, MatchMode, OCTOFINALS_LEVEL, PRACTICE_LEVEL, QUALIFICATION_LEVEL, QUARTERFINALS_LEVEL, RANKING_LEVEL, ROUND_ROBIN_LEVEL, SEMIFINALS_LEVEL, TEST_LEVEL } from "@toa-lib/models";
import { convertEMSStationToFMS } from "../helpers/generic.js";
import { EStop, RobotStatus } from "../models/PlcOutputCoils.js";
import { SocketSupport } from "./socket.js";
import { SettingsSupport } from "./settings.js";
import { AccesspointSupport } from "./accesspoint.js";

const logger = log("driverstation");

export class DriverstationSupport {
  private dsTcpListenPort = 1750;
  private dsUdpSendPort = 1121;
  private dsUdpReceivePort = 1160;
  private dsTcpLinkTimeoutSec = 5;
  private dsUdpLinkTimeoutSec = 1;
  private maxTcpPacketBytes = 4096;

  private updateSocketInterval: any;

  // TODO: Figure this out
  public colorToSend = 0;

  private processLock = false;

  private closeMode = false;

  private allDriverStations: DSConn[] = [];

  private udpDSListener = dgram.createSocket("udp4");
  private tcpListener = net.createServer();

  private stationNames: string[] = [
    "Red 1",
    "Red 2",
    "Red 3",
    "Blue 1",
    "Blue 2",
    `Blue 3`,
  ];

  private static _instance: DriverstationSupport;

  public constructor() { }

  public static getInstance(): DriverstationSupport {
    if (typeof DriverstationSupport._instance === "undefined") {
      DriverstationSupport._instance = new DriverstationSupport();
    }
    return DriverstationSupport._instance;
  }

  public dsInit(host: string): any {
    this.udpInit(this.dsUdpReceivePort, host);
    this.tcpInit(this.dsTcpListenPort, host);

    // Register socket to update twice a second
    this.updateSocketInterval = setInterval(() => {
      SocketSupport.getInstance().dsUpdate(this.dsToJsonObj());
    }, 500);
  }

  public kill(silent: boolean = true) {
    this.closeMode = true;
    clearInterval(this.updateSocketInterval);
    try {
      this.tcpListener.close();
      this.udpDSListener.close();
      if (!silent) logger.warn("🛑 Driverstation Listeners Killed");
    } catch {
      // Do nothing
    }
    this.closeMode = false;
  }

  // Init the UDP Server: This listens for new drivers stations
  private udpInit(port: number, host: string) {
    this.udpDSListener = dgram.createSocket("udp4");
    this.udpDSListener.on("listening", () => {
      const address = this.udpDSListener.address();
      logger.info(`✔ Listening for DriverStations on UDP ${address.address}:${address.port}`);
    });

    this.udpDSListener.on("error", (e) => {
      logger.error(
        `❌ Error Listening for DriverStations on UDP. Please make sure your IP Address is set correctly (10.0.100.5). ${e}`
      );
    });

    // Listen for New UDP Packets
    this.udpDSListener.on("message", (data: Buffer, remote) => {
      this.parseUDPPacket(data, remote);
    });

    this.udpDSListener.on("close", () => {
      if (!this.closeMode) logger.error("❌ DriverStation UDP Listener Closed");
    })

    try {
      this.udpDSListener.bind(port, host);
    } catch (e) {
      logger.error(
        `❌ Error Listening for DriverStations UDP. Please make sure your IP Address is set correctly (10.0.100.5). ${e}`
      );
    }
  }

  // Parse a UDP packet from the Driver Station
  // Important bytes:
  // 3 - "Status" byte, see below
  // 4/5 - Team Number
  // 6/7 - Battery Voltage
  // 8+ - "Tag", see below
  // see https://frcture.readthedocs.io/en/latest/driverstation/ds_to_fms.html#status
  private parseUDPPacket(data: Buffer, remote: any) {
    // Parse team number from packet
    const teamNum = (data[4] << 8) + data[5];

    // If teamNum exists and isn't 0
    if (teamNum) {
      // Find driverstation
      const fmsStation = this.allDriverStations.findIndex(ds => ds.teamId === teamNum);
      // If we found driverstation, update its data
      if (fmsStation > -1) {
        // For debugging
        // console.log(`UDP Packet: team ${teamNum}, status: ${data[3]}, tag size: ${data[8]} tag type: ${data[9]}: ${data.subarray(10).join(", ")}`)
        // Mark as connected
        this.allDriverStations[fmsStation].dsStatus.linked = true;
        // Update last packet time
        this.allDriverStations[fmsStation].dsStatus.lastPacketTime = Date.now();
        // Byte 3 of packet is the status byte, each bit representing something different
        // [Estop, <Reserved>, Comms, Radio Ping, Rio Ping, Enabled, Mode[1], Mode[0]]
        // Check if Software ESTOP is set (Bit 7)
        this.allDriverStations[fmsStation].robotStatus.estop = ((data[3] >> 7) & 0x1) !== 0;
        // Chec if Robot Comms are active (Bit 5)
        this.allDriverStations[fmsStation].robotStatus.commsActive = ((data[3] >> 5) & 0x1) !== 0;
        // Check if Radio is Linked (Bit 4)
        this.allDriverStations[fmsStation].robotStatus.radioPing = ((data[3] >> 3) & 0x1) !== 0;
        // Check if Robot is Linked (Bit 3)
        this.allDriverStations[fmsStation].robotStatus.rioPing = ((data[3] >> 3) & 0x1) !== 0;
        // Check if Robot is Enabled (Bit 2)
        this.allDriverStations[fmsStation].robotStatus.enabled = ((data[3] >> 2) & 0x1) !== 0;
        // Check mode (Bits 1,0)
        this.allDriverStations[fmsStation].robotStatus.mode = (((data[3] >> 1) & 0x1) * 2) + (data[3] & 0x1);
        // If Robot is Linked, check Voltage
        if (this.allDriverStations[fmsStation].robotStatus.rioPing) {
          // Update last robot linked time
          this.allDriverStations[fmsStation].robotStatus.lastLinkedTime = Date.now();
          // Robot battery voltage, stored as volts * 256.
          this.allDriverStations[fmsStation].robotStatus.batteryVoltage = data[6] + data[7] / 256;
        }
        // Check various tags
        // Tag 0x00: Field Radio Metrics [Signal Strength, Bandwidth]
        // Tag 0x01: Comms Metrics [Lost Packet[1], Lost Packet[0] Sent Packets[1], Sent Packets[0] Average Trip Time]
        // Tag 0x02: Laptop Metrics [Battery Percentage, CPU Percentage]
        // Tag 0x03: Robot Radio Metrics [Signal Strength, Bandwidth]
        // Tag 0x04: PD Metrics [] (Not used, for now?)
        switch (data[9]) {
          case 0x00:
            break;
          case 0x01:
            break;
          case 0x02:
            this.allDriverStations[fmsStation].dsStatus.computerBatteryPercent = (data[10] / 255) * 100;
            this.allDriverStations[fmsStation].dsStatus.computerCpuPercent = (data[11] / 255) * 100;
            break;
          case 0x03:
            break;
          case 0x04:
            break;
        }

      } else {
        // DS not in active match
        logger.info("❓ Couldn't find DS matched to UDP packet. Ignoring. ");
      }
    } else {
      // Probably just a keepalive packet?
      // logger.info('Couldn\'t decipher team number from UDP packet');
    }
  }

  // Init the TCP server: This create connections to each Driver Station
  private tcpInit(port: number, host: string) {
    // Create a server
    this.tcpListener = net.createServer();

    // Setup listen event
    this.tcpListener.on("listening", () => {
      logger.info(`✔ Listening for DriverStations on TCP ${host}:${port}`);
    });

    // Host/Port to listen on
    this.tcpListener.listen(port, host);

    // Things to do upon a new TCP connection
    this.tcpListener.on("connection", s => this.onTCPConnection(s));

    this.tcpListener.on("close", () => {
      if (!this.closeMode) logger.error("❌ DriverStation TCP Listener Closed");
    });

    this.tcpListener.on("error", (chunk: Buffer) => {
      logger.error("❌ Driver Station TCP listener error: " + chunk.toString());
    });
  }

  // On TCP Connection
  private onTCPConnection(socket: net.Socket) {
    // Set timeout
    socket.setTimeout(5000);

    // Check if there is an active match
    if (!this.allDriverStations || !this.allDriverStations[0]) {
      // Attempt to prestart if we have a match
      socket.destroy();
      return;
    }

    logger.info(
      `🔌 New DS TCP Connection Established for ${socket.remoteAddress}:${socket.remotePort}`
    );

    // This should read the first packet and assign the TCP connection to the proper alliance member
    socket.on("data", (chunk: Buffer) => {
      this.parseTcpPacket(chunk, socket, socket.remoteAddress);
    });

    socket.on("error", (err: Error) =>
      logger.error(
        `❌ Error occurred on Driver Station TCP socket: ${JSON.stringify(err)}`
      )
    );
  }

  // Parse TCP packet from the Driver Station
  private parseTcpPacket(
    chunk: Buffer,
    socket: net.Socket,
    remoteAddress: string | undefined
  ) {
    // Parse Team number from packet
    const teamId = (chunk[3] << 8) + chunk[4];

    // Check for active match
    if (!this.allDriverStations[0]) {
      socket.destroy();
      return;
    }

    // Find driverstation
    let conn = this.allDriverStations.find((t) => t.teamId === teamId);

    if (conn && chunk.length === 5 /* && !conn.recievedFirstPacket */) {
      // we should be checking if its first packet but isnt always nice
      this.handleFirstTCP(
        chunk,
        socket,
        teamId,
        conn.allianceStation,
        remoteAddress
      );
    } else if (chunk.length !== 5) {
      this.handleRegularTCP(chunk, socket);
    } else {
      logger.info(
        `✋ Rejecting DS Connection from team ${teamId} who is not in the current match.`
      );
      setTimeout(function () {
        // wait before disconnecting
        socket.destroy();
      }, 1000);
    }
  }

  // parse a regular TCP packet
  private handleRegularTCP(chunk: Buffer, socket: net.Socket) {
    // Get team from IP to assume station
    const teamNum = this.getTeamFromIP(socket.remoteAddress);
    const station = this.allDriverStations.findIndex(ds => ds.teamId === teamNum);
    // Find DS to match with
    if (this.allDriverStations[station].teamId == teamNum) {
      // For debugging
      for (let i = 0; i < chunk.length;) {
        // Size is stored at byte 0 and 1, doesn't include 2 bytes for size, so we add 2
        const size = 2 + parseInt(chunk.subarray(i, i + 2).toString("hex"), 16);
        if (size > 2) this.parseTcpData(chunk.subarray(i, i + size), station);
        i += size;
      }
    }
    // TODO Log packet when match is in progress
  }

  private getTeamFromIP(address: any): number {
    const ipAddress = address;
    if (!ipAddress) {
      logger.error(
        "❌ Could not get IP address from first TCP packet. Ignoring."
      );
      return -1;
    }
    const teamRegex = new RegExp("\\d+\\.(\\d+)\\.(\\d+)\\.");
    const teamDigits = teamRegex.exec(ipAddress);
    if (!teamDigits) {
      logger.error("❌ Could not get team number from IP Address");
      return -1;
    }
    const td1 = parseInt(teamDigits[1]);
    const td2 = parseInt(teamDigits[2]);
    return td1 * 100 + td2;
  }

  private parseTcpData(chunk: Buffer, stationId: number) {
    const packetType = chunk[2]
    switch (packetType) {
      case 0x00: // WPILib Version
        this.allDriverStations[stationId].robotStatus.versionData.wpilib = chunk.subarray(3).toString();
        break;
      case 0x01: // RIO Version
        this.allDriverStations[stationId].robotStatus.versionData.rio = chunk.subarray(3).toString();
        break;
      case 0x02: // DS Version
        this.allDriverStations[stationId].robotStatus.versionData.ds = chunk.subarray(3).toString();
        break;
      case 0x03: // PDP Version
        this.allDriverStations[stationId].robotStatus.versionData.pdp = chunk.subarray(3).toString();
        break;
      case 0x04: // PCM Version
        this.allDriverStations[stationId].robotStatus.versionData.pcm = chunk.subarray(3).toString();
        break;
      case 0x05: // CANJag Version
        this.allDriverStations[stationId].robotStatus.versionData.canJag = chunk.subarray(3).toString();
        break;
      case 0x06: // CANTalon Version
        this.allDriverStations[stationId].robotStatus.versionData.canTalon = chunk.subarray(3).toString();
        break;
      case 0x07: // 3rd Party Version
        this.allDriverStations[stationId].robotStatus.versionData.thirdParty = chunk.subarray(3).toString();
        break;
      case 0x15: // Usage Report
        this.allDriverStations[stationId].robotStatus.versionData.usageReport = chunk.subarray(5).toString();
        break;
      case 0x16: // Log Data Packet
        this.decodeStatusPacket(chunk.subarray(2), stationId);
        break;
      case 0x17: // Error/Event Data
        // 0-3 # Messages to process
        // 4-11 # seconds since 1904/01/01 00:00:00 GMT
        // 12-19 Unknown
        // Remaining: Unknown
        // const numMessages = parseInt(chunk.subarray(3, 7).toString("hex"), 16);
        // const timestamp = parseInt(chunk.subarray(7, 15).toString("hex"), 16);
        const message = chunk.subarray(27).toString();
        // TODO: Store last log
        this.allDriverStations[stationId].dsStatus.lastLog = message;
        break;
      case 0x18: // Team number
      case 0x1b: // Challenge response
      case 0x1c: // Keepalive
      case 0x1d: // Keepalive?
        break; // Do nothing
      default:
        if (packetType !== 22 && chunk.length > 0)
          // console.log(`Unknown TCP Packet Data: size: ${chunk.length} packet type: ${packetType}, packet string: ${chunk.subarray(2).toString()}, packet: ${chunk.join(", ")}`)
        break;
    }
  }

  // Parse the initial packet that the driver station sends
  private handleFirstTCP(
    chunk: Buffer,
    socket: net.Socket,
    teamId: number,
    station: number,
    remoteAddress: string | undefined
  ) {
    if (chunk.length < 5) {
      // invalid TCP packet, ignore
      socket.destroy();
      return;
    }

    // Read team number from packet
    const teamFromPacket = (chunk[3] << 8) + chunk[4];

    // Read the team number from the IP address to check for a station mismatch.
    const stationTeamId = this.getTeamFromIP(socket.remoteAddress);

    // Weird station id
    if (stationTeamId < 0) {
      return;
    }

    // Station Status:
    // 0 ="FMS Connected"
    // 1 = "Move to Station <Assigned Station>"
    // 2 = "Waiting..."
    const isAtCorrectStation = stationTeamId === teamFromPacket || stationTeamId === 100;
    if (!isAtCorrectStation) {
      logger.info(
        `❗ Team ${teamId} is in the incorrect station (Currently at ${stationTeamId}'s Station)`
      );
    } else if (stationTeamId === 100) {
      logger.info(
        `❗ Team ${teamId} is connected via the FIELD Network (Vlan 100). Things will work, but this is not the ideal configuration`
      );
    }

    // The FMS Station this DS is at (0-5)
    const fmsStation = convertEMSStationToFMS(station);

    // Build Setup Packet
    // Note: If the DS gets a station status of 1, then it will Close the TCP connection, and cause a constant reconnect loop
    let returnPacket: Buffer = Buffer.alloc(5);
    returnPacket[0] = 0; // Packet Size
    returnPacket[1] = 3; // Packet Size
    returnPacket[2] = 25; // Packet Type
    returnPacket[3] = fmsStation; // Station
    returnPacket[4] = isAtCorrectStation ? 0 : 1; // Station Status

    // Write return packet
    if (socket.write(returnPacket)) {
      logger.info(
        `🕹 Accepted ${teamId}'s DriverStation into ${this.stationNames[fmsStation]}`
      );
      this.allDriverStations[fmsStation] = this.newDSConnection(
        teamId,
        station,
        socket,
        remoteAddress
      );
      this.sendControlPacket(fmsStation);
    } else {
      logger.error(
        `❌ Failed to send first packet to team ${teamId}'s driver station`
      );
    }
  }

  // Create a new DS Connection Object
  private newDSConnection(
    teamId: number,
    allianceStation: number,
    socket: net.Socket,
    remoteAddress: string | undefined
  ): DSConn {
    const newDs = new DSConn();
    newDs.teamId = teamId;
    newDs.dsStatus.packetCount = 1;
    newDs.tcpConn = socket;
    newDs.udpConn = dgram.createSocket("udp4"); // Dummy socket until we get the real one
    if (remoteAddress) newDs.dsStatus.ipAddress = remoteAddress;
    newDs.allianceStation = allianceStation;
    newDs.dsStatus.linked = true;
    newDs.dsStatus.lastPacketTime = Date.now();

    // Set socket events
    socket.on("timeout", (err: Error) =>
      logger.error(`❌ Team ${teamId}'s Driver Station TCP Connection Timed Out`)
    );

    socket.on("close", (wasError: boolean) =>
      logger.error(`❌ Team ${teamId}'s Driver Station TCP Socket was Closed. wasError: ` + wasError)
    );

    return newDs;
  }

  // Run all this stuff
  public runDriverStations() {
    // Process lock
    if (this.processLock) return;
    this.processLock = true;

    // Field EStop Status
    const fieldEStop = PlcSupport.getInstance().getEstop(EStop.Field);
    const matchState = EmsFrcFms.getInstance().matchState;

    // This will be used to set field stack light at the end
    const stationStatuses = [];

    for (let fmsStation = 0; fmsStation < this.allDriverStations.length; fmsStation++) {
      const ds = this.allDriverStations[fmsStation];
      if (ds) {
        // Update Driver Stations if E-STOP, Stop Match is Master E-STOP
        if (fieldEStop) { // Field EStop is Pressed
          ds.fmsStatus.estop = true;
        } else if (
          !PlcSupport.getInstance().getEstop(fmsStation) && // If EStop is pressed
          matchState !== MatchMode.PRESTART && // Ignore estops during prestart
          !ds.fmsStatus.estop // Ignore if already pressed
        ) {
          // Team station estop pressed
          logger.info(`❗ ${this.stationNames[fmsStation]} has E-STOPED their robot!`);
          ds.fmsStatus.estop = true;
        }

        // In match calculations
        if (ds.fmsStatus.estop || ds.robotStatus.estop) { // If EStop is triggered, always set status to disabled
          ds.fmsStatus.auto = false;
          ds.fmsStatus.enabled = false;
        } else if (matchState === MatchMode.PRESTART) {
          ds.fmsStatus.auto = true;
        } else if (matchState === MatchMode.AUTONOMOUS) {
          ds.fmsStatus.auto = true;
          ds.fmsStatus.enabled = true;
        } else if (matchState === MatchMode.TRANSITION) {
          ds.fmsStatus.auto = false;
          ds.fmsStatus.enabled = false;
        } else if (
          matchState === MatchMode.TELEOPERATED ||
          matchState === MatchMode.ENDGAME
        ) {
          ds.fmsStatus.auto = false;
          ds.fmsStatus.enabled = true;
        } else if (matchState === MatchMode.ABORTED) {
          ds.fmsStatus.auto = false;
          ds.fmsStatus.enabled = false;
        } else {
          ds.fmsStatus.auto = false;
          ds.fmsStatus.enabled = false;
        }

        // If we have an active UDP connection, send a UDP Packet
        if (ds.udpConn) {
          // TODO: Don't need to send this every time, unless it's during match
          // Maybe?
          this.sendControlPacket(fmsStation);
        }

        // Check if all things are good
        let allIsGood = false;

        // Calculate time since last packet
        const diff = Date.now() - ds.dsStatus.lastPacketTime;

        // Driverstaion Timeout
        if (diff > this.dsTcpLinkTimeoutSec) {
          ds.dsStatus.linked = false;
          ds.robotStatus.radioPing = false;
          ds.robotStatus.rioPing = false;
          ds.robotStatus.commsActive = false;
          ds.robotStatus.batteryVoltage = 0;
          allIsGood = false;
        } else { // Otherwise, check if all other statuses are good
          allIsGood =
            ds.dsStatus.linked &&
            ds.robotStatus.radioPing &&
            ds.robotStatus.rioPing &&
            !ds.robotStatus.estop &&
            ds.robotStatus.commsActive &&
            ds.robotStatus.batteryVoltage > 0;
        }

        // Update global stack tracker
        stationStatuses[fmsStation] = allIsGood;

        // Set Alliance Stack Light
        PlcSupport.getInstance().setStationStack(fmsStation, allIsGood ? RobotStatus.Connected : RobotStatus.Disconnected);

        // Update last link time
        ds.robotStatus.lastLinkedTime = ds.dsStatus.lastPacketTime;
      }
    }

    // Unlock process
    this.processLock = false;
  }

  private dsToJsonObj(): DriverstationStatus[] {
    // Attepmpt to fetch and link Wifi statuses
    if (SettingsSupport.getInstance().settings.enableAdvNet) {
      const allStatuses = AccesspointSupport.getInstance().teamStatuses;
      for (const ds of this.allDriverStations) {
        const find = allStatuses.find(s => s.teamId === ds.teamId);
        if (find) ds.apStatus = find;
      }
    }

    // Return JSON
    return this.allDriverStations.map(ds => ds.toJson());
  }

  // Send Control Packet
  private sendControlPacket(dsNum: number) {
    const packet = this.constructControlPacket(dsNum);
    if (this.allDriverStations[dsNum].udpConn) {
      this.allDriverStations[dsNum].udpConn.send(
        packet,
        this.dsUdpSendPort,
        this.allDriverStations[dsNum].dsStatus.ipAddress,
        (err) => {
          if (err)
            logger.error(
              "❌ Error sending control packet to station " + dsNum + ": " + err
            );
        }
      );
    }
  }

  // Things to do on match start
  public driverStationMatchStart() {
    for (const ds in this.allDriverStations) {
      this.allDriverStations[ds].dsStatus.missedPacketOffset =
        this.allDriverStations[ds].dsStatus.missedPacketCount;
    }
    // TODO: Init Packet Log
  }

  // Things to do on match end
  public driverStationMatchStop() {
    for (const ds of this.allDriverStations) {
      if (ds.tcpConn) ds.tcpConn.destroy();
      if (ds.udpConn) ds.udpConn.disconnect();
    }
  }

  // Close all connections to the driver station
  private closeDsConn(dsNum: number) {
    if (
      this.allDriverStations[dsNum] &&
      this.allDriverStations[dsNum].udpConn
    ) {
      this.allDriverStations[dsNum].udpConn.close();
    }
    if (
      this.allDriverStations[dsNum] &&
      this.allDriverStations[dsNum].tcpConn
    ) {
      this.allDriverStations[dsNum].tcpConn.destroy();
    }
  }

  // Close All DS Connections
  private closeAllDSConns() {
    let i = 0;
    while (i < this.allDriverStations.length) {
      this.closeDsConn(i);
      i++;
    }
  }

  // DriverStation Things to do on prestart
  public onPrestart(match: Match<any>) {
    // Close all DS Connections before we overwrite them
    this.closeAllDSConns();

    // Init New DriverStation Objects
    this.allDriverStations = match.participants?.map(p => {
      const ds = new DSConn();
      ds.teamId = p.teamKey;
      ds.allianceStation = p.station;
      return ds;
    }).sort((a, b) => a.fmsStation - b.fmsStation) ?? [];

    // We're ready
    SocketSupport.getInstance().dsSuccess();
    logger.info("✔ Prestarted");
  }

  // Construct a control packet for the Driver Station
  private constructControlPacket(dsNum: number): Uint8Array {
    const packet: Uint8Array = new Uint8Array(22);
    const activeMatch = EmsFrcFms.getInstance().activeMatch;

    // Packet number, stored big-endian in two bytes.
    packet[0] = (this.allDriverStations[dsNum].dsStatus.packetCount >> 8) & 0xff;
    packet[1] = this.allDriverStations[dsNum].dsStatus.packetCount & 0xff;

    // Protocol version.
    packet[2] = 0;

    // Robot status byte.
    packet[3] = 0;
    if (this.allDriverStations[dsNum].fmsStatus.auto) {
      packet[3] |= 0x02;
    }
    if (this.allDriverStations[dsNum].fmsStatus.enabled) {
      packet[3] |= 0x04;
    }
    if (this.allDriverStations[dsNum].fmsStatus.estop) {
      packet[3] |= 0x80;
    }

    // Unknown or unused. (Possibly Game data?)
    packet[4] = this.colorToSend;

    // Alliance station.
    packet[5] = dsNum;

    // Match type
    // 0 = Test, 1 = Practice, 2 = Quals, 3 = Elims
    const match = "qual";
    switch (SettingsSupport.getInstance().currentTournament?.tournamentLevel ?? TEST_LEVEL) {
      case TEST_LEVEL:
        packet[6] = 0;
      case PRACTICE_LEVEL:
        packet[6] = 1;
        break;
      case QUALIFICATION_LEVEL:
      case RANKING_LEVEL:
        packet[6] = 2;
        break;
      case ROUND_ROBIN_LEVEL:
      case OCTOFINALS_LEVEL:
      case QUARTERFINALS_LEVEL:
      case SEMIFINALS_LEVEL:
      case FINALS_LEVEL:
        packet[6] = 3;
        break;
    }

    // Match number.
    const localMatchNum = activeMatch?.id || -1;
    const activeTournamentLevel = SettingsSupport.getInstance().currentTournament?.tournamentLevel ?? TEST_LEVEL;
    if (
      match.toLowerCase().indexOf("practice") > -1 ||
      match.toLowerCase().indexOf("qual") > -1
    ) {
      packet[7] = localMatchNum >> 8;
      packet[8] = localMatchNum & 0xff;
    } else if (match.toLowerCase().indexOf("elim") > -1) {
      // E.g. Quarter-final 3, match 1 will be numbered 431.
      let fmsMatchNum = 1;
      // TODO: Attempt to calculate current series
      switch (activeTournamentLevel) {
        case OCTOFINALS_LEVEL:
          fmsMatchNum = (800) + ((1) * 10) + localMatchNum;
          break;
        case QUARTERFINALS_LEVEL:
          fmsMatchNum = (400) + ((1) * 10) + localMatchNum;
          break;
        case SEMIFINALS_LEVEL:
          fmsMatchNum = (200) + ((1) * 10) + localMatchNum;
          break;
        case FINALS_LEVEL:
          fmsMatchNum = (110) + localMatchNum;
          break;
      }
      packet[7] = fmsMatchNum >> 8;
      packet[8] = fmsMatchNum & 0xff;
    } else {
      packet[7] = 0;
      packet[8] = 1;
    }
    // Match repeat number
    packet[9] = 1;

    // Current time.
    const currentTime = new Date(Date.now());
    const nanoSeconds = currentTime.getMilliseconds() * 1000000;
    packet[10] = ((nanoSeconds / 1000) >> 24) & 0xff;
    packet[11] = ((nanoSeconds / 1000) >> 16) & 0xff;
    packet[12] = ((nanoSeconds / 1000) >> 8) & 0xff;
    packet[13] = (nanoSeconds / 1000) & 0xff;
    packet[14] = currentTime.getSeconds();
    packet[15] = currentTime.getMinutes();
    packet[16] = currentTime.getHours();
    packet[17] = currentTime.getDay();
    packet[18] = currentTime.getMonth();
    packet[19] = currentTime.getFullYear() - 1900;

    // Remaining number of seconds in match.
    const matchSecondsRemaining = EmsFrcFms.getInstance().timeLeft;

    packet[20] = (matchSecondsRemaining >> 8) & 0xff;
    packet[21] = matchSecondsRemaining & 0xff;

    // Increment the packet count for next time.
    this.allDriverStations[dsNum].dsStatus.packetCount++;

    return packet;
  }

  // Decodes a Driver Station status packet
  private decodeStatusPacket(data: Buffer, dsNum: number) {
    // Status Packet looks like:
    // [???, Trip Time, Lost Packets, Voltage, Voltage, Robot Status, CAN, SignalDB, Bandwidth[1], Bandwidth[0] ]
    // Parse out Robot Status Byte
    // [Brownout, Watchdog, DS Tele, DS Auto, DS Disable, Robot Tele, Robot Auto, Robot Disable]
    // Parse Brownout (Bit 7)
    this.allDriverStations[dsNum].robotStatus.brownout = ((data[5] >> 7) & 0x1) !== 0;
    // Parse Watchdog (Bit 6)
    this.allDriverStations[dsNum].robotStatus.additionalData.watchdog = ((data[5] >> 6) & 0x1) !== 0;
    // Parse DS Tele (Bit 5)
    this.allDriverStations[dsNum].robotStatus.additionalData.dsTele = ((data[5] >> 5) & 0x1) !== 0;
    // Parse DS Auto (Bit 4)
    this.allDriverStations[dsNum].robotStatus.additionalData.dsAuto = ((data[5] >> 4) & 0x1) !== 0;
    // Parse DS Disable (Bit 3)
    this.allDriverStations[dsNum].robotStatus.additionalData.dsDisable = ((data[5] >> 3) & 0x1) !== 0;
    // Parse Robot Tele (Bit 2)
    this.allDriverStations[dsNum].robotStatus.additionalData.robotTele = ((data[5] >> 2) & 0x1) !== 0;
    // Parse Robot Auto (Bit 1)
    this.allDriverStations[dsNum].robotStatus.additionalData.robotAuto = ((data[5] >> 1) & 0x1) !== 0;
    // Parse Robot Disable (Bit 0)
    this.allDriverStations[dsNum].robotStatus.additionalData.robotDisable = (data[5] & 0x1) !== 0;

    // Bandwidth: round(float(uint16) / 256, 2)
    this.allDriverStations[dsNum].robotStatus.bandwidth = Math.round((data[9] << 8 | data[8]) / 256);

    // Average DS-robot trip time in milliseconds.
    this.allDriverStations[dsNum].robotStatus.tripTimeMs = data[1] / 2;

    // Number of missed packets sent from the DS to the robot.
    this.allDriverStations[dsNum].dsStatus.missedPacketCount =
      data[2] - this.allDriverStations[dsNum].dsStatus.missedPacketOffset;
  }
}

export default DriverstationSupport.getInstance();
