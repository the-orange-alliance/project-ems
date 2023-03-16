import { MatchMode } from "../MatchTimer.js"
import { Tournament } from "../Tournament.js"
import { PrestartStatus } from "./PrestartStatus.js"

export interface DriverstationStatus {
  fmsHwFingerprint: string, // This identifies which FMS this is coming from
  teamKey: number,
  allianceStation: number,
  apStatus: APStatus,
  robotStatus: RobotStatus,
  fmsStatus: FMSStatus,
  dsStatus: DSStatus
}

/**
 * This is the status that the EMS-FRC-FMS emits every ~500ms
 */
export interface DriverstationMonitor {
  dsStatuses: DriverstationStatus[],
  activeTournament?: Tournament,
  matchStatus: MatchMode,
  prestartStatus: PrestartStatus
}

/**
 * These are the statuses we extract from the Field AP
 */
export interface APStatus {
  linked: boolean,
  signal: string,
  quality: string[],
}

/**
 * These are the statuses that the robot sends to FMS
 */
export interface RobotStatus {
  enabled: boolean;
  mode: number; // 0 - teleop, 1 - test, 2 - auto
  estop: boolean;
  radioPing: boolean;
  rioPing: boolean;
  lastLinkedTime: number, // unix timestamp
  commsActive: boolean;
  batteryVoltage: number;
  tripTimeMs: number;
  brownout: boolean;
  bandwidth: number;
  // Additional data that isn't really relevant, or is duplicated
  additionalData: {
    dsTele: boolean,
    dsAuto: boolean,
    dsDisable: boolean,
    robotTele: boolean,
    robotAuto: boolean,
    robotDisable: boolean,
    watchdog: boolean,
  }
  // Version data
  versionData: { // optional, won't be sent every time
    wpilib: string,
    rio: string,
    ds: string,
    pdp: string,
    pcm: string,
    canJag: string,
    canTalon: string,
    thirdParty: string,
    usageReport: string,
  }
}

/**
 * This is the status that the FMS sends to the DS
 */
export interface FMSStatus {
  bypassed: boolean;
  auto: boolean
  enabled: boolean
  estop: boolean
}

/**
 * These are statuses that we extrapolate from our DS connection
 */
export interface DSStatus {
  linked: boolean,
  missedPacketCount: number,
  lastPacketTime: number,
  packetCount: number,
  ipAddress: string,
  missedPacketOffset: number,
  computerBatteryPercent: number,
  computerCpuPercent: number,
  lastLog: string,
}