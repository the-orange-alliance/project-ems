export enum SocketEvents {
    EcosystemUpdate = "fcs:fgc25:ecosystemUpdate",
    ForceEcosystemUpdate = "fcs:fgc25:forceEcosystemUpdate",
    AccelerationUpdate = "fcs:fgc25:accelerationUpdate",
    BiodiversityDispensedUpdate = "fcs:fgc25:biodiversityDispensedUpdate",
}

export type AccelerationState = {
    red: boolean,
    blue: boolean,
};

export type BiodiversityDispensedState = {
    red: number;
    blue: number;
};

export enum Ecosystem {
    RedSide = 0,
    Center = 1,
    BlueSide = 2,
}

export interface EcosystemUpdate {
    ecosystem: Ecosystem;
    position: 0 | 1 | 2 | 3;
}

export enum ElevatorDirectionType {
    kUp,
    kDown,
    kStop
}

export type TornadoConstants = {
    kUpTurboSpeed: number;
    kUpSpeed: number;
    kDownSpeed: number;
    kStopSpeed: number;
};

export type OuttakeConstants = {
    kFwdSpeed: number;
    kRevSpeed: number;
    kStopSpeed: number;
};

export type BallDispenserConstants = {
    kBlueOuttakeId: number;
    kBlueTornadoLeaderId: number;
    kBlueTornadoFollowerId: number;
    kRedOuttakeId: number;
    kRedTornadoLeaderId: number;
    kRedTornadoFollowerId: number;
    TornadoConstants: TornadoConstants;
    OuttakeConstants: OuttakeConstants;
};

export type ElevatorConstants = {
    kStallLimit: number;
    kNominalVoltage: number;
    kOutputClamp: number;
    kUpSpeed: number;
    kDownSpeed: number;
    kStopSpeed: number;
    kLevel0Position: number;
    kLevel1Position: number;
    kLevel2Position: number;
    kLevel3Position: number;
    kLevelPositions: readonly number[];
    kP: number;
    kI: number;
    kD: number;
    kTolerance: number;
    kRampRate: number;
    kMaxVelocity: number;
    kMaxAcceleration: number;
    kZeroingUpSpeed: number;
    kZeroingVelocityThreshold: number;
    kZeroingTimeout: number;
    kBallPresentAnalogThreshold: number;
    kSettleTime: number;
};

export type PillarConstants = {
    kBackId: number;
    kBackWledAddress: string;
    kBackWledSegment: number;
    kBlueId: number;
    kBlueWledAddress: string;
    kBlueWledSegment: number;
    kRedId: number;
    kRedWledAddress: string;
    kRedWledSegment: number;
    kLedLength: number;
    kLedStart: number;
    kLedLowestScorablePosition: number;
    kLedStartingScorableIndex: number;
    kNegativeSpaceColor: string;
    kScorableZoneColor: string;
    kScoredColor: string;
    ElevatorConstants: ElevatorConstants;
};

export type RopeDropConstants = {
    kId: number;
};

export type FlowControllerConstants = {
    kBlueId: number;
    kBlueWledAddress: string;
    kRedId: number;
    kRedWledAddress: string;
    kLedLength: number;
    kLedStart: number;
    kRateLength: number;
    kFlowRateColor: string;
    kNegativeSpaceColor: string;
    kLevel2Threshold: number;
    kLevel3Threshold: number;
    kEnergizedThreshold: number;
    kTimeToEnergize: number;
    kGuaranteedPeriod: number;
};

export type FCSConstants = {
    kFCSAddress: string;
    kMatchEndBuffer: number;
    kEndgameFlashTime: number;
};

export type ConstantsType = {
    kEStopDioChannel: number;
    BallDispenserConstants: BallDispenserConstants;
    PillarConstants: PillarConstants;
    RopeDropConstants: RopeDropConstants;
    FlowControllerConstants: FlowControllerConstants;
};

export const constants: ConstantsType = Object.freeze({
    kEStopDioChannel: 0,
    BallDispenserConstants: {
        kBlueOuttakeId: 4,
        kBlueTornadoLeaderId: 5,
        kBlueTornadoFollowerId: 6,
        kRedOuttakeId: 1,
        kRedTornadoLeaderId: 2,
        kRedTornadoFollowerId: 3,
        TornadoConstants: {
            kUpTurboSpeed: 1.0,
            kUpSpeed: 0.5,
            kDownSpeed: -0.5,
            kStopSpeed: 0.0,
        },
        OuttakeConstants: {
            kFwdSpeed: -0.5,
            kRevSpeed: 0.5,
            kStopSpeed: 0.0,
        },
    },
    PillarConstants: {
        kBackId: 7,
        kBackWledAddress: "quad-ctr-field-5.local",
        kBackWledSegment: 1,
        kBlueId: 8,
        kBlueWledAddress: "quad-ctr-field-5.local",
        kBlueWledSegment: 2,
        kRedId: 9,
        kRedWledAddress: "quad-ctr-field-5.local",
        kRedWledSegment: 0,
        kLedLength: 61,
        kLedStart: 0,
        kLedLowestScorablePosition: 5,
        kLedStartingScorableIndex: 52,
        kNegativeSpaceColor: "ffffff",
        kScorableZoneColor: "000000",
        kScoredColor: "00ff00",
        ElevatorConstants: {
            kStallLimit: 20,
            kNominalVoltage: 12,
            kOutputClamp: 0.4,
            kUpSpeed: 0.1,
            kDownSpeed: -0.1,
            kStopSpeed: 0.0,
            kLevel0Position: 0.0,
            kLevel1Position: 11.7,
            kLevel2Position: 39.5,
            kLevel3Position: 63.0,
            kLevelPositions: [
                0.0, 11.7, 39.5, 63.0
            ] as const,
            kP: 0.02,
            kI: 0.0,
            kD: 0.0,
            kTolerance: 0.25,
            kRampRate: 0.5,
            kMaxVelocity: 10.0,
            kMaxAcceleration: 20.0,
            kZeroingUpSpeed: 0.20,
            kZeroingVelocityThreshold: 0.3,
            kZeroingTimeout: 5.0,
            kBallPresentAnalogThreshold: 2.5,
            kSettleTime: 2,
        },
    },
    RopeDropConstants: {
        kId: 10,
    },
    FlowControllerConstants: {
        kBlueId: 11,
        kBlueWledAddress: "uno-blue-field-5.local",
        kRedId: 11,
        kRedWledAddress: "uno-red-field-5.local",
        kLedLength: 71,
        kLedStart: 3,
        kRateLength: Math.ceil(71 / 2) - Math.floor(3 / 2),
        kFlowRateColor: "ff00cc",
        kNegativeSpaceColor: "ffffff",
        kLevel2Threshold: 11,
        kLevel3Threshold: 23,
        kEnergizedThreshold: 250,
        kTimeToEnergize: 5,
        kGuaranteedPeriod: 15,
    },
    Heartbeat: {
        broadcastIdArray: [
            0xFF,
            0xFF,
            0xFF,
            0xFF,
            0xFF,
            0xFF,
            0xFF,
            0xFF
        ] as const,
        HEARTBEAT_ID: 0x02052c80,
        STREAM_BUFFER_LIMIT: 5,
        MESSAGE_PERIOD: 0,
        CAN_DEVICE_ID: 0,
        CAN_REV_ID: 5,
        CAN_DEVICE_TYPE_FLEX: 2,
    }
});
