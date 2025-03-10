import { APStatus, DriverstationStatus, DSStatus, FMSStatus, RobotStatus } from "@toa-lib/models";
import * as dgram from "dgram";
import * as net from "net";
import { SettingsSupport } from "../devices/settings.js";
import { convertEMSStationToFMS } from "../helpers/generic.js";

export default class DSConn {
    public teamId: number;
    public allianceStation: number;
    public tcpConn: net.Socket;
    public udpConn: dgram.Socket;
    // These are statuses that are extrapolated from the field AP
    public apStatus: APStatus;
    // Statuses that FMS sends to the DS
    public fmsStatus: FMSStatus;
    // Statuses that the DS sends to FMS
    public robotStatus: RobotStatus;
    // Other DS Statuses
    public dsStatus: DSStatus;
    // TODO Add Logging functionality

    constructor() {
        this.teamId = -1;
        this.allianceStation = -1;
        this.tcpConn = new net.Socket();
        this.udpConn = dgram.createSocket("udp4");
        this.apStatus = {
            linked: false,
            quality: ['unknown', '70'],
            signal: 'unknown'
        }
        this.robotStatus = {
            enabled: false,
            mode: 0,
            estop: false,
            radioPing: false,
            rioPing: false,
            lastLinkedTime: 0,
            commsActive: false,
            batteryVoltage: 0,
            tripTimeMs: 0,
            brownout: false,
            bandwidth: 0,
            additionalData: {
                dsTele: false,
                dsAuto: false,
                dsDisable: false,
                robotTele: false,
                robotAuto: false,
                robotDisable: false,
                watchdog: false,
            },
            versionData: {
                canJag: 'unknown',
                canTalon: 'unknown',
                ds: 'unknown',
                pdp: 'unknown',
                pcm: 'unknown',
                rio: 'unknown',
                wpilib: 'unknown',
                thirdParty: 'unknown',
                usageReport: 'unknown'
            }
        }
        this.fmsStatus = {
            bypassed: false,
            auto: true,
            enabled: false,
            estop: false
        }
        this.dsStatus = {
            linked: false,
            missedPacketCount: 0,
            lastPacketTime: 0,
            packetCount: 0,
            ipAddress: '',
            missedPacketOffset: 0,
            computerBatteryPercent: 0,
            computerCpuPercent: 0,
            lastLog: ""
        }
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
            robotStatus: this.robotStatus,
            fmsStatus: this.fmsStatus,
            dsStatus: this.dsStatus
        };
    }

    get fmsStation() {
        return convertEMSStationToFMS(this.allianceStation);
    }
}


