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
  kLedLength: number;
  kLedStart: number;
  kLedLowestScorablePosition: number;
  kLedStartingScorableIndex: number;

  kNegativeSpaceColor: string;
  kScorableZoneColor: string;
  kScoredColor: string;

  kStartingLevel: number;

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
  // LED strip is folded in half and effect is mirrored
  kLedLength: number;
  kLedStart: number;

  kMediumFlowRateColor: string;
  kHighFlowRateColor: string;
  kNegativeSpaceColor: string;

  kLevel2Threshold: number;
  kLevel3Threshold: number;

  // Accelerator
  kEnergizedThreshold: number;
  kTimeToEnergize: number;
  kGuaranteedPeriod: number;
}

export interface MatchStateColors {
  kMatchEndColor: string;
}

export type SettingsType = {
  matchStateColors: MatchStateColors;
  dispenserSettings: DispenserSettings;
  ecosystemSettings: EcosystemSettings;
  acceleratorSettings: AcceleratorSettings;
  kEStopDioChannel: number;
};

export const DEFAULT_SETTINGS: SettingsType = {
  kEStopDioChannel: 0,
  matchStateColors: {
    kMatchEndColor: '#000000'
  },
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
    kLedLength: 61,
    kLedStart: 0,
    kLedLowestScorablePosition: 5,
    kLedStartingScorableIndex: 52,

    kNegativeSpaceColor: '#ffffff',
    kScorableZoneColor: '#000000',
    kScoredColor: '#00ff00',

    kStartingLevel: 3,

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
    // LED strip is folded in half and effect is mirrored
    kLedLength: 71,
    kLedStart: 3,

    kMediumFlowRateColor: '#ffa500',
    kHighFlowRateColor: '#00ff00',
    kNegativeSpaceColor: '#ffffff',

    kLevel2Threshold: 11,
    kLevel3Threshold: 23,

    // Accelerator
    kEnergizedThreshold: 250,
    kTimeToEnergize: 5,
    kGuaranteedPeriod: 15
  }
};

export interface WledFcsStatus {
  redConnected: boolean;
  redStickyDisconnect: boolean;
  blueConnected: boolean;
  blueStickyDisconnect: boolean;
  centerConnected: boolean;
  centerStickyDisconnect: boolean;
}

export interface DispenserFcsStatus {
  temperature: number;
  current: number;
  unjamCount: number;
  indexerBeamBreak: boolean;
};

export interface EcosystemFcsStatus {
  l3BeamBreak: boolean;
  l2BeamBreak: boolean;
  l1BeamBreak: boolean;
  forceCount: number;
}

export interface AcceleratorFcsStatus {
  velocity: number;
}

export interface FcsStatus {
  wled: WledFcsStatus;

  redDispenser: DispenserFcsStatus;
  blueDispenser: DispenserFcsStatus;

  redEcosystem: EcosystemFcsStatus;
  blueEcosystem: EcosystemFcsStatus;
  centerEcosystem: EcosystemFcsStatus;

  redAccelerator: AcceleratorFcsStatus;
  blueAccelerator: AcceleratorFcsStatus;
};
