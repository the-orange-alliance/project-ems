import {
  FieldControlInitPacket,
  FieldControlUpdatePacket,
  FieldOptions,
  LedSegment
} from '../base/FieldControl.js';
import {
  applyPatternToStrips,
  applySetpointToMotors,
  LedStrip,
  Motor
} from './Packets.js';

enum RevHub {
  RED_CONTROL_HUB = 0,
  BLUE_CONTROL_HUB = 1,
  CENTER_EXPANSION_HUB = 2,
  CENTER_CONTROL_HUB = 3
}

export class MotorA extends Motor {
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
}

type WledController = 'center' | 'red' | 'blue';
export class LedStripA extends LedStrip {
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
    ...this.RED_SIDE_GOALS,
    ...this.RED_CENTER_GOALS
  ];

  public static readonly ALL_BLUE_GOALS = [
    ...this.BLUE_SIDE_GOALS,
    ...this.BLUE_CENTER_GOALS
  ];

  public static readonly ALL_NEXUS_GOALS = [
    ...this.ALL_RED_GOALS,
    ...this.ALL_BLUE_GOALS
  ];

  public static readonly ALL_STRIPS = [...this.ALL_NEXUS_GOALS, this.RAMP];

  public constructor(controller: WledController, segment: number) {
    super(controller, segment);
  }
}

const createNexusGoalSegments = (
  fieldOptions: FieldOptions,
  startingIndex: number = 0
): LedSegment[] => {
  const segments: LedSegment[] = [];
  for (let i = 0; i < 6; i++) {
    segments.push({
      start: i * fieldOptions.goalLedLength + startingIndex,
      stop: (i + 1) * fieldOptions.goalLedLength + startingIndex
    });
  }
  return segments;
};

export class PacketManager {
  private fieldOptions: FieldOptions;
  private broadcastCallback: (update: FieldControlUpdatePacket) => void =
    () => {};

  public constructor(fieldOptions: FieldOptions) {
    this.fieldOptions = fieldOptions;
  }

  public initialize = (
    broadcast: (update: FieldControlUpdatePacket) => void
  ) => {
    this.broadcastCallback = broadcast;
  };

  /**
   * This packet must specify the initial state of EVERY port that will be used at any point.
   */
  getInitPacket = (): FieldControlInitPacket => {
    const result: FieldControlInitPacket = { hubs: {}, wleds: {} };

    result.wleds['center'] = {
      address: this.fieldOptions.centerWledWebSocketAddress,
      segments: [
        ...createNexusGoalSegments(this.fieldOptions),
        ...createNexusGoalSegments(
          this.fieldOptions,
          6 * this.fieldOptions.goalLedLength
        ),
        {
          start: 2 * 6 * this.fieldOptions.goalLedLength,
          stop:
            2 * 6 * this.fieldOptions.goalLedLength +
            this.fieldOptions.rampLedLength
        }
      ]
    };

    result.wleds['red'] = {
      address: this.fieldOptions.redWledWebSocketAddress,
      segments: createNexusGoalSegments(this.fieldOptions)
    };

    result.wleds['blue'] = {
      address: this.fieldOptions.blueWledWebSocketAddress,
      segments: createNexusGoalSegments(this.fieldOptions)
    };

    const ensureHub = (hub: RevHub) => {
      if (result.hubs[hub] == undefined) {
        result.hubs[hub] = { motors: [], servos: [], digitalInputs: [] };
      }
    };

    MotorA.ALL_GOALS.forEach((motor) => {
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
  };

  public handleAbort = (): void => {
    const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
    applyPatternToStrips(
      this.fieldOptions.fieldFaultColor,
      LedStripA.ALL_STRIPS,
      result
    );

    this.broadcastCallback(result);
  };

  public handlePrepareField = (): void => {
    const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
    applyPatternToStrips(
      this.fieldOptions.prepareFieldColor,
      LedStripA.ALL_STRIPS,
      result
    );
    applySetpointToMotors(0, MotorA.ALL_GOALS, result);

    this.broadcastCallback(result);
  };

  public handleMatchStart = (): void => {
    const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
    applyPatternToStrips('000000', LedStripA.ALL_STRIPS, result);

    this.broadcastCallback(result);
  };

  public handleEndGame = (): void => {
    // This game has no end game
  };

  public handleMatchEnd = (): void => {
    const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
    applyPatternToStrips(
      this.fieldOptions.matchEndBlueNexusGoalColor,
      LedStripA.ALL_BLUE_GOALS,
      result
    );
    applyPatternToStrips(
      this.fieldOptions.matchEndRedNexusGoalColor,
      LedStripA.ALL_RED_GOALS,
      result
    );
    applyPatternToStrips(
      this.fieldOptions.matchEndRampColor,
      [LedStripA.RAMP],
      result
    );
    applySetpointToMotors(0, MotorA.ALL_GOALS, result);

    this.broadcastCallback(result);
  };

  public handleAllClear = (): void => {
    const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
    applyPatternToStrips(
      this.fieldOptions.allClearColor,
      LedStripA.ALL_STRIPS,
      result
    );
    applySetpointToMotors(
      this.fieldOptions.foodResetMotorSetpoint,
      MotorA.ALL_GOALS,
      result
    );

    this.broadcastCallback(result);
  };

  public setFieldOptions = (fieldOptions: FieldOptions): void => {
    this.fieldOptions = fieldOptions;
  };
}
