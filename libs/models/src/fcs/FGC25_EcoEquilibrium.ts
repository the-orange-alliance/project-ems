export enum SocketEvents {
  EcosystemUpdate = 'fcs:fgc25:ecosystemUpdate',
  ForceEcosystemUpdate = 'fcs:fgc25:forceEcosystemUpdate',
  AccelerationUpdate = 'fcs:fgc25:accelerationUpdate',
  BiodiversityDispensedUpdate = 'fcs:fgc25:biodiversityDispensedUpdate'
}

export enum FieldSide {
  Red = 0,
  Blue = 1
}

export enum AcceleratorState {
  Idle = 0,
  Energizing = 1,
  Deenergizing = 2
}

export enum FlowRate {
  Low = 0,
  Medium = 1,
  High = 2
}

export type AcceleratorStatus = {
  state: AcceleratorState;
  rate: FlowRate;
  progress: number;
};

export enum Ecosystem {
  RedSide = 0,
  Center = 1,
  BlueSide = 2
}

export interface EcosystemUpdate {
  ecosystem: Ecosystem;
  position: 0 | 1 | 2 | 3;
}

export interface AcceleratorUpdate {
  side: FieldSide;
  status: AcceleratorStatus;
}

export interface DispenserUpdate {
  side: FieldSide;
  biodiversityDispensed: number;
}

export interface DispenserSettings {
  tornado: {
    kUpTurboSpeed: number;
    kUpSpeed: number;
    kDownSpeed: number;
    kStopSpeed: number;
  };
  indexer: {
    kFwdSpeed: number;
    kRevSpeed: number;
    kStopSpeed: number;
  };
}

export interface EcosystemSettings {
  kBackWledAddress: string;
  kBackWledSegment: number;

  kBlueWledAddress: string;
  kBlueWledSegment: number;

  kRedWledAddress: string;
  kRedWledSegment: number;

  kLedLength: number;
  kLedStart: number;
  kLedLowestScorablePosition: number;
  kLedStartingScorableIndex: number;

  kNegativeSpaceColor: string;
  kScorableZoneColor: string;
  kScoredColor: string;

  elevator: {
    kUpSpeed: number;
    kDownSpeed: number;
    kStopSpeed: number;

    kLevel0Position: number;
    kLevel1Position: number;
    kLevel2Position: number;
    kLevel3Position: number;

    kZeroingUpSpeed: number;
    kZeroingVelocityThreshold: number;
    kZeroingTimeout: number;

    kBallPresentAnalogThreshold: number;
    kSettleTime: number;
  };
}

export interface AcceleratorSettings {
  kBlueWledAddress: string;
  kRedWledAddress: string;

  // LED strip is folded in half and effect is mirrored
  kLedLength: number;
  kLedStart: number;

  kFlowRateColor: string;
  kNegativeSpaceColor: string;

  kLevel2Threshold: number;
  kLevel3Threshold: number;

  // Accelerator
  kEnergizedThreshold: number;
  kTimeToEnergize: number;
  kGuaranteedPeriod: number;
}

export type SettingsType = {
  kEStopDioChannel: number;
  dispenserSettings: DispenserSettings;
  ecosystemSettings: EcosystemSettings;
  acceleratorSettings: AcceleratorSettings;
};

export const DEFAULT_SETTINGS: SettingsType = {
  kEStopDioChannel: 0,
  dispenserSettings: {
    tornado: {
      kUpTurboSpeed: 1.0,
      kUpSpeed: 0.5,
      kDownSpeed: -0.5,
      kStopSpeed: 0.0
    },
    indexer: {
      kFwdSpeed: -0.5,
      kRevSpeed: 0.5,
      kStopSpeed: 0.0
    }
  },
  ecosystemSettings: {
    kBackWledAddress: 'quad-ctr-field-1.local',
    kBackWledSegment: 1,

    kBlueWledAddress: 'quad-ctr-field-1.local',
    kBlueWledSegment: 2,

    kRedWledAddress: 'quad-ctr-field-1.local',
    kRedWledSegment: 0,

    kLedLength: 61,
    kLedStart: 0,
    kLedLowestScorablePosition: 5,
    kLedStartingScorableIndex: 52,

    kNegativeSpaceColor: '#ffffff',
    kScorableZoneColor: '#000000',
    kScoredColor: '#00ff00',

    elevator: {
      kUpSpeed: 0.1,
      kDownSpeed: -0.1,
      kStopSpeed: 0.0,

      kLevel0Position: 0.0,
      kLevel1Position: 11.7,
      kLevel2Position: 39.5,
      kLevel3Position: 63.0,

      kZeroingUpSpeed: 0.2,
      kZeroingVelocityThreshold: 0.3, // encoder units/sec
      kZeroingTimeout: 5.0, // sec

      kBallPresentAnalogThreshold: 2.5,
      kSettleTime: 2
    }
  },
  acceleratorSettings: {
    kBlueWledAddress: 'uno-blue-field-1.local',
    kRedWledAddress: 'uno-red-field-1.local',

    // LED strip is folded in half and effect is mirrored
    kLedLength: 71,
    kLedStart: 3,

    kFlowRateColor: '#ff00cc',
    kNegativeSpaceColor: '#ffffff',

    kLevel2Threshold: 11,
    kLevel3Threshold: 23,

    // Accelerator
    kEnergizedThreshold: 250,
    kTimeToEnergize: 5,
    kGuaranteedPeriod: 15
  }
};
