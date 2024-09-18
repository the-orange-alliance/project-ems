import EventEmitter from 'node:events';
import {
  DigitalInputsResult,
  FieldControlInitPacket,
  FieldControlUpdatePacket,
  FieldOptions,
  LedSegment
} from '../base/FieldControl.js';
import { NexusGoalState } from '../seasons/FeedingTheFuture.js';
import { FeedingTheFuture } from '../seasons/index.js';
import {
  applyPartialPatternToStrips,
  applyPatternToStrips,
  applySetpointToMotors,
  LedStrip,
  Motor
} from './Packets.js';
import {
  ItemUpdate,
  MatchSocketEvent,
  NumberAdjustment
} from '../base/Match.js';

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
  private broadcastCallback: (update: FieldControlUpdatePacket) => void;
  private matchEmitter: EventEmitter;
  private timers = new Map<string, NodeJS.Timeout>();
  private matchInProgress: boolean = false;

  public constructor(
    fieldOptions: FieldOptions,
    broadcastCallback: (update: FieldControlUpdatePacket) => void,
    matchEmitter: EventEmitter
  ) {
    this.fieldOptions = fieldOptions;
    this.broadcastCallback = broadcastCallback;
    this.matchEmitter = matchEmitter;
  }

  public setFieldOptions = (fieldOptions: FieldOptions): void => {
    this.fieldOptions = fieldOptions;
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
    this.matchInProgress = false;

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
    this.matchInProgress = true;

    const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
    applyPatternToStrips(
      this.fieldOptions.goalEmptyColor,
      LedStripA.ALL_STRIPS,
      result
    );

    this.broadcastCallback(result);
  };

  public handleEndGame = (): void => {
    // This game has no end game
  };

  public handleMatchEnd = (): void => {
    this.matchInProgress = false;

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

  public handleMatchUpdate = (
    previousDetails: FeedingTheFuture.MatchDetails,
    currentDetails: FeedingTheFuture.MatchDetails,
    broadcast: (update: FieldControlUpdatePacket) => void
  ) => {
    if (!this.matchInProgress) return;

    this.handleGoalStateChange(
      previousDetails.redNexusState.CW1,
      currentDetails.redNexusState.CW1,
      LedStripA.RED_SIDE_GOALS[0],
      MotorA.RED_SIDE_GOALS[0],
      'redNexusState.CW1',
      'red',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.redNexusState.CW2,
      currentDetails.redNexusState.CW2,
      LedStripA.RED_SIDE_GOALS[1],
      MotorA.RED_SIDE_GOALS[1],
      'redNexusState.CW2',
      'red',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.redNexusState.CW3,
      currentDetails.redNexusState.CW3,
      LedStripA.RED_SIDE_GOALS[2],
      MotorA.RED_SIDE_GOALS[2],
      'redNexusState.CW3',
      'red',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.redNexusState.CW4,
      currentDetails.redNexusState.CW4,
      LedStripA.RED_SIDE_GOALS[3],
      MotorA.RED_SIDE_GOALS[3],
      'redNexusState.CW4',
      'red',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.redNexusState.CW5,
      currentDetails.redNexusState.CW5,
      LedStripA.RED_SIDE_GOALS[4],
      MotorA.RED_SIDE_GOALS[4],
      'redNexusState.CW5',
      'red',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.redNexusState.CW6,
      currentDetails.redNexusState.CW6,
      LedStripA.RED_SIDE_GOALS[5],
      MotorA.RED_SIDE_GOALS[5],
      'redNexusState.CW6',
      'red',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.redNexusState.EC1,
      currentDetails.redNexusState.EC1,
      LedStripA.RED_CENTER_GOALS[0],
      MotorA.RED_CENTER_GOALS[0],
      'redNexusState.EC1',
      'red',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.redNexusState.EC2,
      currentDetails.redNexusState.EC2,
      LedStripA.RED_CENTER_GOALS[1],
      MotorA.RED_CENTER_GOALS[1],
      'redNexusState.EC2',
      'red',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.redNexusState.EC3,
      currentDetails.redNexusState.EC3,
      LedStripA.RED_CENTER_GOALS[2],
      MotorA.RED_CENTER_GOALS[2],
      'redNexusState.EC3',
      'red',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.redNexusState.EC4,
      currentDetails.redNexusState.EC4,
      LedStripA.RED_CENTER_GOALS[3],
      MotorA.RED_CENTER_GOALS[3],
      'redNexusState.EC4',
      'red',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.redNexusState.EC5,
      currentDetails.redNexusState.EC5,
      LedStripA.RED_CENTER_GOALS[4],
      MotorA.RED_CENTER_GOALS[4],
      'redNexusState.EC5',
      'red',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.redNexusState.EC6,
      currentDetails.redNexusState.EC6,
      LedStripA.RED_CENTER_GOALS[5],
      MotorA.RED_CENTER_GOALS[5],
      'redNexusState.EC6',
      'red',
      broadcast
    );

    this.handleGoalStateChange(
      previousDetails.blueNexusState.CW1,
      currentDetails.blueNexusState.CW1,
      LedStripA.BLUE_SIDE_GOALS[0],
      MotorA.BLUE_SIDE_GOALS[0],
      'blueNexusState.CW1',
      'blue',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.blueNexusState.CW2,
      currentDetails.blueNexusState.CW2,
      LedStripA.BLUE_SIDE_GOALS[1],
      MotorA.BLUE_SIDE_GOALS[1],
      'blueNexusState.CW2',
      'blue',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.blueNexusState.CW3,
      currentDetails.blueNexusState.CW3,
      LedStripA.BLUE_SIDE_GOALS[2],
      MotorA.BLUE_SIDE_GOALS[2],
      'blueNexusState.CW3',
      'blue',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.blueNexusState.CW4,
      currentDetails.blueNexusState.CW4,
      LedStripA.BLUE_SIDE_GOALS[3],
      MotorA.BLUE_SIDE_GOALS[3],
      'blueNexusState.CW4',
      'blue',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.blueNexusState.CW5,
      currentDetails.blueNexusState.CW5,
      LedStripA.BLUE_SIDE_GOALS[4],
      MotorA.BLUE_SIDE_GOALS[4],
      'blueNexusState.CW5',
      'blue',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.blueNexusState.CW6,
      currentDetails.blueNexusState.CW6,
      LedStripA.BLUE_SIDE_GOALS[5],
      MotorA.BLUE_SIDE_GOALS[5],
      'blueNexusState.CW6',
      'blue',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.blueNexusState.EC1,
      currentDetails.blueNexusState.EC1,
      LedStripA.BLUE_CENTER_GOALS[0],
      MotorA.BLUE_CENTER_GOALS[0],
      'blueNexusState.EC1',
      'blue',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.blueNexusState.EC2,
      currentDetails.blueNexusState.EC2,
      LedStripA.BLUE_CENTER_GOALS[1],
      MotorA.BLUE_CENTER_GOALS[1],
      'blueNexusState.EC2',
      'blue',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.blueNexusState.EC3,
      currentDetails.blueNexusState.EC3,
      LedStripA.BLUE_CENTER_GOALS[2],
      MotorA.BLUE_CENTER_GOALS[2],
      'blueNexusState.EC3',
      'blue',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.blueNexusState.EC4,
      currentDetails.blueNexusState.EC4,
      LedStripA.BLUE_CENTER_GOALS[3],
      MotorA.BLUE_CENTER_GOALS[3],
      'blueNexusState.EC4',
      'blue',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.blueNexusState.EC5,
      currentDetails.blueNexusState.EC5,
      LedStripA.BLUE_CENTER_GOALS[4],
      MotorA.BLUE_CENTER_GOALS[4],
      'blueNexusState.EC5',
      'blue',
      broadcast
    );
    this.handleGoalStateChange(
      previousDetails.blueNexusState.EC6,
      currentDetails.blueNexusState.EC6,
      LedStripA.BLUE_CENTER_GOALS[5],
      MotorA.BLUE_CENTER_GOALS[5],
      'blueNexusState.EC6',
      'blue',
      broadcast
    );

    this.handleRampStateChange(
      previousDetails.fieldBalanced,
      currentDetails.fieldBalanced,
      broadcast
    );
  };

  private handleGoalStateChange = (
    previousState: NexusGoalState,
    currentState: NexusGoalState,
    strip: LedStripA,
    motor: MotorA,
    goal: string,
    side: string,
    broadcast: (update: FieldControlUpdatePacket) => void
  ) => {
    if (previousState === currentState) return;

    const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };

    // Full goal will be handled later
    if (currentState === NexusGoalState.BlueOnly) {
      applyPatternToStrips(
        this.fieldOptions.goalBlueOnlyColor,
        [strip],
        result
      );
    } else if (currentState === NexusGoalState.GreenOnly) {
      applyPatternToStrips(
        this.fieldOptions.goalGreenOnlyColor,
        [strip],
        result
      );
    } else if (currentState === NexusGoalState.Empty) {
      applyPatternToStrips(this.fieldOptions.goalEmptyColor, [strip], result);
    }

    if (
      currentState === NexusGoalState.Full &&
      previousState !== NexusGoalState.Full
    ) {
      this.runFoodProductionSequence(motor, strip, side, goal);
    } else if (
      currentState !== NexusGoalState.Full &&
      previousState === NexusGoalState.Full
    ) {
      // Cancel timer if there is one
      clearTimeout(this.timers.get(goal));
    }

    // Broadcast update
    broadcast(result);
  };

  private handleRampStateChange = (
    previousBalanced: number,
    currentBalanced: number,
    broadcast: (update: FieldControlUpdatePacket) => void
  ) => {
    if (currentBalanced === previousBalanced) return;

    clearTimeout(this.timers.get('ramp'));

    this.timers.set(
      'ramp',
      setTimeout(() => {
        const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
        applyPatternToStrips(
          currentBalanced
            ? this.fieldOptions.rampBalancedColor
            : this.fieldOptions.rampUnbalancedColor,
          [LedStripA.RAMP],
          result
        );
        broadcast(result);
      }, this.fieldOptions.rampHysteresisWindowMs)
    );
  };

  public handleDigitalInputs = (packet: DigitalInputsResult) => {
    if (!this.matchInProgress) return;

    const balanced = (packet.hubs[RevHub.CENTER_CONTROL_HUB] & 0x1) !== 1;
    this.matchEmitter.emit(MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM, {
      key: 'fieldBalanced',
      value: balanced
    } satisfies ItemUpdate);
  };

  runFoodProductionSequence = (
    motor: MotorA,
    strip: LedStripA,
    side: string,
    goal: string
  ) => {
    const steps = 10;

    const recurse = (count: number) => {
      if (!this.matchInProgress) return;

      // Base state. Food production is over, dispense food and update lights
      if (count === 0) {
        // Update lights and run motor
        const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
        applyPatternToStrips(this.fieldOptions.goalFullColor, [strip], result);
        applySetpointToMotors(
          this.fieldOptions.foodProductionMotorSetpoint,
          [motor],
          result
        );
        this.broadcastCallback(result);

        // Stop motor after the configured duration
        this.timers.set(
          goal,
          setTimeout(() => {
            const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
            applySetpointToMotors(0, [motor], result);
            this.broadcastCallback(result);
          }, this.fieldOptions.foodProductionMotorDurationMs)
        );

        // Update food produced count
        this.matchEmitter.emit(MatchSocketEvent.MATCH_ADJUST_DETAILS_NUMBER, {
          key: `${side}FoodProduced`,
          adjustment: 1
        } satisfies NumberAdjustment);

        // Update goal state
        this.matchEmitter.emit(MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM, {
          key: goal,
          value: NexusGoalState.Produced
        });

        return;
      }

      // Determine starting and ending indexes for outward growing lights
      const middle = Math.floor(23 / 2);
      const length = Math.floor(23 / 2 / steps) * (steps - count + 1);
      const startIndex = middle - length;
      const endIndex = middle + 1 + length;

      const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };

      applyPartialPatternToStrips(
        this.fieldOptions.goalFullSecondaryColor,
        0,
        24,
        [strip],
        result
      );
      applyPartialPatternToStrips(
        this.fieldOptions.goalFullColor,
        startIndex,
        endIndex,
        [strip],
        result
      );
      this.broadcastCallback(result);

      this.timers.set(
        goal,
        setTimeout(() => {
          recurse(count - 1);
        }, Math.floor(this.fieldOptions.foodProductionDelayMs / steps))
      );
    };

    recurse(steps);
  };
}
