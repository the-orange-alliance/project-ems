import { Match } from "../Match.js"
import { MatchMode } from "../MatchTimer.js"
import { Tournament } from "../Tournament.js"
import { PrestartStatus } from "./PrestartStatus.js"

export interface DriverstationStatus {
  fmsHwFingerprint: string, // This identifies which FMS this is coming from
  teamKey: number,
  allianceStation: number,
  apStatus: APStatus
  enabled: boolean,
  bypassed: boolean,
  auto: boolean,
  estop: boolean,
  dsLinked: boolean,
  radioLinked: boolean,
  robotLinked: boolean,
  batteryVoltage: number,
  robotTripTimeMs: number,
  missedPacketCount: number,
  secSinceLastRobotLink: number,
  lastPacketTime: number,
  lastRobotLinkedTime: number,
  packetCount: number,
  ipAddress: string,
  missedPacketOffset: number
}

export interface DriverstationMonitor {
  dsStatuses: DriverstationStatus[],
  activeTournament?: Tournament,
  matchStatus: MatchMode,
  prestartStatus: PrestartStatus
}

export interface APStatus {
  linked: boolean,
  signal: string,
  quality: string[],
}