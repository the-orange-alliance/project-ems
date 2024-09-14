import {
  FieldControlInitPacket,
  FieldControlUpdatePacket,
  FieldOptions,
  LedSegment
} from '../base/FieldControl.js';

export interface FcsPackets {
  init: FieldControlInitPacket;
  fieldFault: FieldControlUpdatePacket;
  prepareField: FieldControlUpdatePacket;
  matchStart: FieldControlUpdatePacket;
  endgame: FieldControlUpdatePacket;
  matchEnd: FieldControlUpdatePacket;
  allClear: FieldControlUpdatePacket;
}

enum RevHub {
  RED_CONTROL_HUB = 0,
  CENTER_EXPANSION_HUB = 1,
  CENTER_CONTROL_HUB = 2,
  BLUE_CONTROL_HUB = 3
}

function createNexusGoalSegments(
  fieldOptions: FieldOptions,
  startingIndex: number = 0
): LedSegment[] {
  const segments: LedSegment[] = [];
  for (let i = 0; i < 6; i++) {
    segments.push({
      start: i * fieldOptions.goalLedLength + startingIndex,
      stop: (i + 1) * fieldOptions.goalLedLength + startingIndex
    });
  }
  return segments;
}

function applyPatternToStrips(
  color: string,
  strips: LedStrip[],
  packet: FieldControlUpdatePacket
): void {
  strips.forEach((strip) => {
    if (!packet.wleds[strip.controller]) {
      packet.wleds[strip.controller] = {
        patterns: []
      };
    }

    packet.wleds[strip.controller].patterns.push({
      segment: strip.segment,
      color
    });
  });
}

function applySetpointToMotors(
  setpoint: number,
  motors: Motor[],
  packet: FieldControlUpdatePacket
): void {
  motors.forEach((motor) => {
    if (packet.hubs[motor.hub] == undefined) {
      packet.hubs[motor.hub] = { motors: [], servos: [], digitalInputs: [] };
    }

    if (motor.portType === 'on board') {
      packet.hubs[motor.hub].motors?.push({
        port: motor.port,
        setpoint: setpoint
      });
    } else if (motor.portType === 'spark mini') {
      packet.hubs[motor.hub].servos?.push({
        port: motor.port,
        pulseWidth: setpoint * 1000 + 1500
      });
    }
  });
}

type WledController = 'center' | 'red' | 'blue';

class LedStrip {
  public static readonly RED_SIDE_GOALS = [
    new LedStrip('red', 0),
    new LedStrip('red', 1),
    new LedStrip('red', 2),
    new LedStrip('red', 3),
    new LedStrip('red', 4),
    new LedStrip('red', 5)
  ];

  public static readonly BLUE_SIDE_GOALS = [
    new LedStrip('blue', 0),
    new LedStrip('blue', 1),
    new LedStrip('blue', 2),
    new LedStrip('blue', 3),
    new LedStrip('blue', 4),
    new LedStrip('blue', 5)
  ];

  public static readonly RED_CENTER_GOALS = [
    new LedStrip('center', 0),
    new LedStrip('center', 1),
    new LedStrip('center', 2),
    new LedStrip('center', 3),
    new LedStrip('center', 4),
    new LedStrip('center', 5)
  ];

  public static readonly BLUE_CENTER_GOALS = [
    new LedStrip('center', 6),
    new LedStrip('center', 7),
    new LedStrip('center', 8),
    new LedStrip('center', 9),
    new LedStrip('center', 10),
    new LedStrip('center', 11)
  ];

  public static readonly RAMP = new LedStrip('center', 12);

  public static readonly ALL_RED_GOALS = [
    ...LedStrip.RED_SIDE_GOALS,
    ...LedStrip.RED_CENTER_GOALS
  ];

  public static readonly ALL_BLUE_GOALS = [
    ...LedStrip.BLUE_SIDE_GOALS,
    ...LedStrip.BLUE_CENTER_GOALS
  ];

  public static readonly ALL_NEXUS_GOALS = [
    ...LedStrip.ALL_RED_GOALS,
    ...LedStrip.ALL_BLUE_GOALS
  ];

  public static readonly ALL_STRIPS = [
    ...LedStrip.ALL_NEXUS_GOALS,
    LedStrip.RAMP
  ];

  public readonly controller: WledController;
  public readonly segment: number;

  private constructor(controller: WledController, segment: number) {
    this.controller = controller;
    this.segment = segment;
  }
}

type MotorPortType = 'on board' | 'spark mini';

class Motor {
  public static readonly RED_SIDE_GOALS: Motor[] = [
    new Motor(RevHub.RED_CONTROL_HUB, 'on board', 0),
    new Motor(RevHub.RED_CONTROL_HUB, 'on board', 1),
    new Motor(RevHub.RED_CONTROL_HUB, 'on board', 2),
    new Motor(RevHub.RED_CONTROL_HUB, 'on board', 3),
    new Motor(RevHub.RED_CONTROL_HUB, 'spark mini', 4),
    new Motor(RevHub.RED_CONTROL_HUB, 'spark mini', 5)
  ];

  public static readonly BLUE_SIDE_GOALS: Motor[] = [
    new Motor(RevHub.BLUE_CONTROL_HUB, 'on board', 0),
    new Motor(RevHub.BLUE_CONTROL_HUB, 'on board', 1),
    new Motor(RevHub.BLUE_CONTROL_HUB, 'on board', 2),
    new Motor(RevHub.BLUE_CONTROL_HUB, 'on board', 3),
    new Motor(RevHub.BLUE_CONTROL_HUB, 'spark mini', 4),
    new Motor(RevHub.BLUE_CONTROL_HUB, 'spark mini', 5)
  ];

  public static readonly RED_CENTER_GOALS: Motor[] = [
    new Motor(RevHub.CENTER_CONTROL_HUB, 'on board', 0),
    new Motor(RevHub.CENTER_CONTROL_HUB, 'on board', 1),
    new Motor(RevHub.CENTER_CONTROL_HUB, 'on board', 2),
    new Motor(RevHub.CENTER_CONTROL_HUB, 'on board', 3),
    new Motor(RevHub.CENTER_CONTROL_HUB, 'spark mini', 4),
    new Motor(RevHub.CENTER_CONTROL_HUB, 'spark mini', 5)
  ];

  public static readonly BLUE_CENTER_GOALS: Motor[] = [
    new Motor(RevHub.CENTER_EXPANSION_HUB, 'on board', 0),
    new Motor(RevHub.CENTER_EXPANSION_HUB, 'on board', 1),
    new Motor(RevHub.CENTER_EXPANSION_HUB, 'on board', 2),
    new Motor(RevHub.CENTER_EXPANSION_HUB, 'on board', 3),
    new Motor(RevHub.CENTER_EXPANSION_HUB, 'spark mini', 4),
    new Motor(RevHub.CENTER_EXPANSION_HUB, 'spark mini', 5)
  ];

  public static readonly ALL_GOALS = [
    ...this.RED_SIDE_GOALS,
    ...this.BLUE_SIDE_GOALS,
    ...this.RED_CENTER_GOALS,
    ...this.BLUE_CENTER_GOALS
  ];

  public readonly hub: RevHub;
  public readonly portType: MotorPortType;
  public readonly port: number;

  private constructor(hub: RevHub, portType: MotorPortType, port: number) {
    this.hub = hub;
    this.portType = portType;
    this.port = port;
  }
}

/**
 * This packet must specify the initial state of EVERY port that will be used at any point.
 */
function buildInitPacket(fieldOptions: FieldOptions): FieldControlInitPacket {
  const result: FieldControlInitPacket = { hubs: {}, wleds: {} };

  result.wleds['center'] = {
    address: fieldOptions.centerWledWebSocketAddress,
    segments: [
      ...createNexusGoalSegments(fieldOptions),
      ...createNexusGoalSegments(fieldOptions, 6 * fieldOptions.goalLedLength),
      {
        start: 2 * 6 * fieldOptions.goalLedLength,
        stop: 2 * 6 * fieldOptions.goalLedLength + fieldOptions.rampLedLength
      }
    ]
  };

  result.wleds['red'] = {
    address: fieldOptions.redWledWebSocketAddress,
    segments: createNexusGoalSegments(fieldOptions)
  };

  result.wleds['blue'] = {
    address: fieldOptions.blueWledWebSocketAddress,
    segments: createNexusGoalSegments(fieldOptions)
  };

  const ensureHub = (hub: RevHub) => {
    if (result.hubs[hub] == undefined) {
      result.hubs[hub] = { motors: [], servos: [], digitalInputs: [] };
    }
  };

  Motor.ALL_GOALS.forEach((motor) => {
    ensureHub(motor.hub);
    if (motor.portType === 'on board') {
      result.hubs[motor.hub]!.motors!.push({
        port: motor.port,
        setpoint: 0
      });
    } else if (motor.portType === 'spark mini') {
      result.hubs[motor.hub]!.servos!.push({
        port: motor.port,
        pulseWidth: 1500,
        framePeriod: 20000
      });
    }
  });

  result.hubs[RevHub.CENTER_CONTROL_HUB]!.digitalInputs!.push({
    channel: 0,
    triggerOptions: null
  });

  return result;
}

function buildFieldFaultPacket(
  fieldOptions: FieldOptions
): FieldControlUpdatePacket {
  const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
  applyPatternToStrips(
    fieldOptions.fieldFaultColor,
    LedStrip.ALL_STRIPS,
    result
  );
  return result;
}

function buildPrepareFieldPacket(
  fieldOptions: FieldOptions
): FieldControlUpdatePacket {
  const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
  applyPatternToStrips(
    fieldOptions.prepareFieldColor,
    LedStrip.ALL_STRIPS,
    result
  );
  applySetpointToMotors(0, Motor.ALL_GOALS, result);
  return result;
}

function buildMatchStartPacket(
  fieldOptions: FieldOptions
): FieldControlUpdatePacket {
  const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
  applyPatternToStrips('000000', LedStrip.ALL_STRIPS, result);
  return result;
}

function buildEndgamePacket(
  fieldOptions: FieldOptions
): FieldControlUpdatePacket {
  const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
  return result;
}

function buildMatchEndPacket(
  fieldOptions: FieldOptions
): FieldControlUpdatePacket {
  const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
  applyPatternToStrips(
    fieldOptions.matchEndBlueNexusGoalColor,
    LedStrip.ALL_BLUE_GOALS,
    result
  );
  applyPatternToStrips(
    fieldOptions.matchEndRedNexusGoalColor,
    LedStrip.ALL_RED_GOALS,
    result
  );
  applyPatternToStrips(fieldOptions.matchEndRampColor, [LedStrip.RAMP], result);
  applySetpointToMotors(0, Motor.ALL_GOALS, result);
  return result;
}

function buildAllClearPacket(
  fieldOptions: FieldOptions
): FieldControlUpdatePacket {
  const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
  applyPatternToStrips(fieldOptions.allClearColor, LedStrip.ALL_STRIPS, result);
  applySetpointToMotors(
    fieldOptions.foodResetMotorSetpoint,
    Motor.ALL_GOALS,
    result
  );
  return result;
}

export function getFcsPackets(fieldOptions: FieldOptions): FcsPackets {
  return {
    init: buildInitPacket(fieldOptions),
    fieldFault: buildFieldFaultPacket(fieldOptions),
    prepareField: buildPrepareFieldPacket(fieldOptions),
    matchStart: buildMatchStartPacket(fieldOptions),
    endgame: buildEndgamePacket(fieldOptions),
    matchEnd: buildMatchEndPacket(fieldOptions),
    allClear: buildAllClearPacket(fieldOptions)
  };
}
