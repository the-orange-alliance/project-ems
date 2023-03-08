import { APStatus, DriverstationStatus } from "@toa-lib/models";
import * as dgram from "dgram";
import * as net from "net";
import { SettingsSupport } from "../devices/settings.js";
import { convertEMSStationToFMS } from "../helpers/generic.js";

export default class DSConn {
    public teamId: number;
    public allianceStation: number;
    public auto: boolean;
    public enabled: boolean;
    public estop: boolean;
    public bypassed: boolean;
    public dsLinked: boolean;
    public radioLinked: boolean;
    public apStatus: APStatus;
    public robotLinked: boolean;
    public batteryVoltage: number;
    public dsRobotTripTimeMs: number;
    public missedPacketCount: number;
    public secondsSinceLastRobotLink: number;
    public lastPacketTime: number; // date
    public lastRobotLinkedTime: number; // date
    public packetCount: number;
    public ipAddress: string;
    public missedPacketOffset: number;
    public recievedFirstPacket: boolean;
    public tcpConn: net.Socket;
    public udpConn: dgram.Socket;
    // TODO Add Logging functionality

    constructor() {
        this.teamId = -1;
        this.allianceStation = -1;
        this.auto = false;
        this.enabled = false;
        this.bypassed = false;
        this.estop = false;
        this.dsLinked = false;
        this.radioLinked = false;
        this.robotLinked = false;
        this.batteryVoltage = 0;
        this.dsRobotTripTimeMs = 0;
        this.missedPacketCount = 0;
        this.secondsSinceLastRobotLink = 0;
        this.lastPacketTime = 0;
        this.lastRobotLinkedTime = 0;
        this.packetCount = 0;
        this.ipAddress = '';
        this.missedPacketOffset = 0;
        this.recievedFirstPacket = false;
        this.apStatus = {
            linked: false,
            quality: ['unknown', '70'],
            signal: 'unknown'
        }
        this.tcpConn = new net.Socket();
        this.udpConn = dgram.createSocket("udp4");
    }

    toJson(): DriverstationStatus {
        return {
            fmsHwFingerprint: SettingsSupport.getInstance().hwFingerprint,
            teamKey: this.teamId,
            allianceStation: this.allianceStation,
            apStatus: { // because enevitably it will at some point be undefined so we must check
                linked: this.apStatus?.linked ?? false,
                quality: this.apStatus?.quality ?? ['unknown', '70'],
                signal: this.apStatus?.signal ?? 'unknown',
            },
            enabled: this.enabled,
            bypassed: this.bypassed,
            auto: this.auto,
            estop: this.estop,
            dsLinked: this.dsLinked,
            radioLinked: this.radioLinked,
            robotLinked: this.robotLinked,
            batteryVoltage: this.batteryVoltage,
            robotTripTimeMs: this.dsRobotTripTimeMs,
            missedPacketCount: this.missedPacketCount,
            secSinceLastRobotLink: this.secondsSinceLastRobotLink,
            lastPacketTime: this.lastPacketTime,
            lastRobotLinkedTime: this.lastRobotLinkedTime,
            packetCount: this.packetCount,
            ipAddress: this.ipAddress,
            missedPacketOffset: this.missedPacketOffset
        };
    }

    get fmsStation() {
        return convertEMSStationToFMS(this.allianceStation);
    }
}


