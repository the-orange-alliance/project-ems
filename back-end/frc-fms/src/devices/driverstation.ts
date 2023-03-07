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

let udpDSListener = dgram.createSocket("udp4");
let tcpListener = net.createServer();

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

  private allDriverStations: DSConn[] = [];
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

  dsInit(host: string): any {
    this.udpInit(this.dsUdpReceivePort, host);
    this.tcpInit(this.dsTcpListenPort, host);

    // Register socket to update twice a second
    this.updateSocketInterval = setInterval(() => {
      SocketSupport.getInstance().socket?.emit("frc-fms:ds-update", this.dsToJsonObj());
    }, 500);
  }

  public kill(silent: boolean = true) {
    clearInterval(this.updateSocketInterval);
    try {
      tcpListener.close();
      udpDSListener.close();
      if (!silent) logger.info("🛑 Driverstation Listeners Killed");
    } catch {
      // Do nothing
    }
  }

  // Init the UDP Server: This listens for new drivers stations
  private udpInit(port: number, host: string) {
    udpDSListener = dgram.createSocket("udp4");
    udpDSListener.on("listening", function () {
      const address = udpDSListener.address();
      logger.info(`✔ Listening for DriverStations on UDP ${address.address}:${address.port}`);
    });

    udpDSListener.on("error", function (e) {
      logger.error(
        `❌ Error Listening for DriverStations on UDP. Please make sure your IP Address is set correctly (10.0.100.5). ${e}`
      );
    });

    // Listen for New UDP Packets
    udpDSListener.on("message", (data: Buffer, remote) => {
      this.parseUDPPacket(data, remote);
    });

    try {
      udpDSListener.bind(port, host);
    } catch (e) {
      logger.error(
        `❌ Error Listening for DriverStations UDP. Please make sure your IP Address is set correctly (10.0.100.5). ${e}`
      );
    }
  }

  // Parse a UDP packet from the Driver Station
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
        PlcSupport.getInstance().setStationStack(fmsStation, RobotStatus.Connected);
        // Mark as connected
        this.allDriverStations[fmsStation].dsLinked = true;
        // Update last packet time
        this.allDriverStations[fmsStation].lastPacketTime = Date.now();
        // Check if Radio is Linked
        this.allDriverStations[fmsStation].radioLinked = (data[3] & 0x10) !== 0;
        // Check if Robot is Linked
        this.allDriverStations[fmsStation].robotLinked = (data[3] & 0x20) !== 0;
        // If Robot is Linked, check Voltage
        if (this.allDriverStations[fmsStation].robotLinked) {
          // Update last robot linked time
          this.allDriverStations[fmsStation].lastRobotLinkedTime = Date.now();
          // Robot battery voltage, stored as volts * 256.
          this.allDriverStations[fmsStation].batteryVoltage = data[6] + data[7] / 256;
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
    tcpListener = net.createServer();

    // Setup listen event
    tcpListener.on("listening", () => {
      logger.info(`✔ Listening for DriverStations on TCP ${host}:${port}`);
    });

    // Host/Port to listen on
    tcpListener.listen(port, host);

    // Things to do upon a new TCP connection
    tcpListener.on("connection", this.onTCPConnection);

    tcpListener.on("close", () =>
      logger.error("❌ DriverStation TCP Listener Closed")
    );

    tcpListener.on("error", (chunk: Buffer) => {
      logger.error("❌ Driver Station TCP listener error: " + chunk.toString());
    });
  }

  // On TCP Connection
  private onTCPConnection(socket: net.Socket) {
    // Set timeout
    socket.setTimeout(5000);

    // Check if there is an active match
    if (!this.allDriverStations || !this.allDriverStations[0]) {
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

    for (const i in this.allDriverStations) {
      // Find DS to match with
      if (this.allDriverStations[i].teamId == teamNum) {
        const packetType = chunk[2];
        switch (packetType) {
          case 28:
            logger.info("DS KeepAlive");
            break; // DS KeepAlive Packet, do nothing
          case 22:
            this.decodeStatusPacket(chunk.slice(2), parseInt(i));
        }
        break;
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
    newDs.recievedFirstPacket = true;
    newDs.tcpConn = socket;
    newDs.udpConn = dgram.createSocket("udp4"); // Dummy socket until we get the real one
    if (remoteAddress) newDs.ipAddress = remoteAddress;
    newDs.allianceStation = allianceStation;
    newDs.dsLinked = true;
    newDs.secondsSinceLastRobotLink = -1;
    newDs.lastPacketTime = Date.now();
    newDs.lastRobotLinkedTime = -1

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
          ds.estop = true;
        } else if (
          !PlcSupport.getInstance().getEstop(fmsStation) && // If EStop is pressed
          matchState !== MatchMode.PRESTART && // Ignore estops during prestart
          !ds.estop // Ignore if already pressed
        ) {
          // Team station estop pressed
          logger.info(`❗ ${this.stationNames[fmsStation]} has E-STOPED their robot!`);
          ds.estop = true;
        }

        // In match calculations
        if (ds.estop) { // If EStop is triggered, always set status to disabled
          ds.auto = false;
          ds.enabled = false;
        } else if (matchState === MatchMode.PRESTART) {
          ds.auto = true;
        } else if (matchState === MatchMode.AUTONOMOUS) {
          ds.auto = true;
          ds.enabled = true;
        } else if (matchState === MatchMode.TRANSITION) {
          ds.auto = false;
          ds.enabled = false;
        } else if (
          matchState === MatchMode.TELEOPERATED ||
          matchState === MatchMode.ENDGAME
        ) {
          ds.auto = false;
          ds.enabled = true;
        } else if (matchState === MatchMode.ABORTED) {
          ds.auto = false;
          ds.enabled = false;
        } else {
          ds.auto = false;
          ds.enabled = false;
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
        const diff = Date.now() - ds.lastPacketTime;

        // Driverstaion Timeout
        if (diff > this.dsTcpLinkTimeoutSec) {
          ds.dsLinked = false;
          ds.radioLinked = false;
          ds.robotLinked = false;
          ds.batteryVoltage = 0;
          allIsGood = false;
        } else { // Otherwise, check if all other statuses are good
          allIsGood =
            ds.dsLinked &&
            ds.radioLinked &&
            ds.robotLinked &&
            ds.batteryVoltage > 0;
        }

        // Update global stack tracker
        stationStatuses[fmsStation] = allIsGood;

        // Set Alliance Stack Light
        PlcSupport.getInstance().setStationStack(fmsStation, allIsGood ? RobotStatus.Connected : RobotStatus.Disconnected);

        // Update last link time
        ds.secondsSinceLastRobotLink = Math.abs(diff / 1000);
      }
    }

    // Unlock process
    this.processLock = false;
  }

  private dsToJsonObj(): DriverstationStatus[] {
    return this.allDriverStations.map(ds => ds.toJson());
  }

  // Send Control Packet
  private sendControlPacket(dsNum: number) {
    const packet = this.constructControlPacket(dsNum);
    if (this.allDriverStations[dsNum].udpConn) {
      this.allDriverStations[dsNum].udpConn.send(
        packet,
        this.dsUdpSendPort,
        this.allDriverStations[dsNum].ipAddress,
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
      this.allDriverStations[ds].missedPacketOffset =
        this.allDriverStations[ds].missedPacketCount;
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
    for (const p of match.participants ?? []) {
      // run through list of match participants looking for a match
      const ds = new DSConn();
      ds.teamId = p.teamKey;
      ds.allianceStation = p.station;
      const fmsStation = convertEMSStationToFMS(p.station);
      this.allDriverStations[fmsStation] = ds;
    }
    SocketSupport.getInstance().dsReady();
    logger.info("✔ Driver Station Prestart Completed");
  }

  // Construct a control packet for the Driver Station
  private constructControlPacket(dsNum: number): Uint8Array {
    const packet: Uint8Array = new Uint8Array(22);
    const activeMatch = EmsFrcFms.getInstance().activeMatch;

    // Packet number, stored big-endian in two bytes.
    packet[0] = (this.allDriverStations[dsNum].packetCount >> 8) & 0xff;
    packet[1] = this.allDriverStations[dsNum].packetCount & 0xff;

    // Protocol version.
    packet[2] = 0;

    // Robot status byte.
    packet[3] = 0;
    if (this.allDriverStations[dsNum].auto) {
      packet[3] |= 0x02;
    }
    if (this.allDriverStations[dsNum].enabled) {
      packet[3] |= 0x04;
    }
    if (this.allDriverStations[dsNum].estop) {
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
    this.allDriverStations[dsNum].packetCount++;

    return packet;
  }

  // Decodes a Driver Station status packet
  private decodeStatusPacket(data: Buffer, dsNum: number) {
    // Average DS-robot trip time in milliseconds.
    this.allDriverStations[dsNum].dsRobotTripTimeMs = data[1] / 2;

    // Number of missed packets sent from the DS to the robot.
    this.allDriverStations[dsNum].missedPacketCount =
      data[2] - this.allDriverStations[dsNum].missedPacketOffset;
  }
}

export default DriverstationSupport.getInstance();
