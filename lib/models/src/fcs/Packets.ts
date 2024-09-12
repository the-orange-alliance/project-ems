import {
  FieldControlInitPacket,
  FieldControlUpdatePacket,
  FieldOptions,
  HubUpdateParameters,
  LedSegment,
  WledUpdateParameters
} from '../base/FieldControl.js';
import { UnreachableError } from '../types.js';
import { Alliance } from '../base/Match.js';

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
  TOTE = 0,
  RED_HYDROGEN_TANK = 1,
  BLUE_HYDROGEN_TANK = 2
}

enum ConversionButtonDigitalChannel {
  RED = 0,
  BLUE = 2
}

type PwmDeviceType = 'servo';
type PwmDeviceFieldElement =
  | 'oxygenAccumulator'
  | 'hydrogenTank'
  | 'conversionButton'
  | 'oxygenReleaser';

class PwmDevice {
  public static readonly RED_OXYGEN_RELEASER_SERVO = new PwmDevice(
    RevHub.TOTE,
    2,
    'red',
    'oxygenReleaser',
    'servo'
  );
  public static readonly BLUE_OXYGEN_RELEASER_SERVO = new PwmDevice(
    RevHub.TOTE,
    5,
    'blue',
    'oxygenReleaser',
    'servo'
  );

  public static readonly ALL_PWM_DEVICES = [
    PwmDevice.RED_OXYGEN_RELEASER_SERVO,
    PwmDevice.BLUE_OXYGEN_RELEASER_SERVO
  ];

  public readonly hub: RevHub;
  public readonly port: number;
  public readonly alliance: Alliance;
  public readonly type: PwmDeviceType;
  public readonly framePeriod_us: number;
  public readonly fieldElement: PwmDeviceFieldElement;

  private constructor(
    hub: RevHub,
    port: number,
    alliance: Alliance,
    fieldElement: PwmDeviceFieldElement,
    type: PwmDeviceType
  ) {
    this.hub = hub;
    this.port = port;
    this.alliance = alliance;
    this.type = type;
    this.fieldElement = fieldElement;
    /*
     * Using multiple different frame periods can cause problems w/ Expansion Hub firmware version 1.8.2.
     * REV employees: see https://github.com/REVrobotics/ExpansionHubFW/issues/81
     *
     * Additionally, the shorter the frame period, the faster the Blinkin patterns are.
     */
    this.framePeriod_us = 20000;
  }
}

interface PwmCommand {
  device: PwmDevice;
  pulseWidth_us: number;
}

function assemblePwmCommands(
  pwmCommands: PwmCommand[]
): FieldControlUpdatePacket {
  // Sort the commands for optimal visual synchronization.
  // The most important thing is to have field elements of the same type grouped together.
  pwmCommands.sort((a, b) => {
    if (a.device.fieldElement == b.device.fieldElement) {
      return 0; // Elements have the same priority
    } else if (
      a.device.fieldElement == 'hydrogenTank' ||
      b.device.fieldElement == 'hydrogenTank'
    ) {
      // Hydrogen tanks are wireless, list them first
      return a.device.fieldElement == 'hydrogenTank' ? -1 : 1;
    } else if (
      a.device.fieldElement == 'oxygenAccumulator' ||
      b.device.fieldElement == 'oxygenAccumulator'
    ) {
      // Oxygen accumulators are most prominent, list them next
      return a.device.fieldElement == 'oxygenAccumulator' ? -1 : 1;
    } else if (
      a.device.fieldElement == 'conversionButton' ||
      b.device.fieldElement == 'conversionButton'
    ) {
      // Prioritize button visual feedback over moving the servo
      return a.device.fieldElement == 'conversionButton' ? -1 : 1;
    } else {
      /*
       * We shouldn't be able to get to this point (though we can't convince the Typescript compiler of that),
       * because the only way to get here is if both field elements are oxygenReleaser, and we've already covered
       * the case where the field elements are the same.
       */
      return 0;
    }
  });

  // This type is the same as the hubs field in FieldControlUpdatePacket, but with
  // only servo parameters, and the servo parameters are required instead of optional.
  const hubs: Record<
    string,
    Required<Pick<HubUpdateParameters, 'servos'>>
  > = {};

  const ensureHub = (hub: RevHub) => {
    if (hubs[hub] == undefined) {
      hubs[hub] = { servos: [] };
    }
  };

  for (const command of pwmCommands) {
    ensureHub(command.device.hub);
    hubs[command.device.hub].servos.push({
      port: command.device.port,
      pulseWidth: command.pulseWidth_us
    });
  }

  return { hubs, wleds: {} };
}

function cancelConversionButtonTriggers(packet: FieldControlUpdatePacket) {
  let toteHub = packet.hubs[RevHub.TOTE];
  if (toteHub == undefined) {
    toteHub = {};
    packet.hubs[RevHub.TOTE] = toteHub;
  }

  if (toteHub.digitalInputs === undefined) {
    toteHub.digitalInputs = [];
  }

  for (let conversionButtonDigitalChannel in ConversionButtonDigitalChannel) {
    const digitalChannelNumber = Number.parseInt(
      conversionButtonDigitalChannel
    );
    if (Number.isNaN(digitalChannelNumber)) {
      continue;
    } // Filter out the string entries on the enum

    toteHub.digitalInputs.push({
      channel: digitalChannelNumber,
      triggerOptions: null
    });
  }
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
      targetSegments: strip.segments,
      color
    });
  });
}

type WledController = 'center' | 'red' | 'blue';

class LedStrip {
  public static readonly RED_NEXUS_GOAL = new LedStrip(
    'red',
    [0, 1, 2, 3, 4, 5]
  );
  public static readonly BLUE_NEXUS_GOAL = new LedStrip(
    'blue',
    [0, 1, 2, 3, 4, 5]
  );
  public static readonly RED_CENTER_NEXUS_GOAL = new LedStrip(
    'center',
    [0, 1, 2, 3, 4, 5]
  );
  public static readonly BLUE_CENTER_NEXUS_GOAL = new LedStrip(
    'center',
    [6, 7, 8, 9, 10, 11]
  );
  public static readonly RAMP = new LedStrip('center', [12]);

  public static readonly ALL_RED_STRIPS = [
    LedStrip.RED_NEXUS_GOAL,
    LedStrip.RED_CENTER_NEXUS_GOAL
  ];

  public static readonly ALL_BLUE_STRIPS = [
    LedStrip.BLUE_NEXUS_GOAL,
    LedStrip.BLUE_CENTER_NEXUS_GOAL
  ];

  public static readonly ALL_NEXUS_GOALS = [
    ...LedStrip.ALL_RED_STRIPS,
    ...LedStrip.ALL_BLUE_STRIPS
  ];

  public static readonly ALL_STRIPS = [
    ...LedStrip.ALL_NEXUS_GOALS,
    LedStrip.RAMP
  ];

  public readonly controller: WledController;
  public readonly segments: number[];

  private constructor(controller: WledController, segments: number[]) {
    this.controller = controller;
    this.segments = segments;
  }
}

/**
 * This packet must specify the initial state of EVERY port that will be used at any point.
 */
function buildInitPacket(fieldOptions: FieldOptions): FieldControlInitPacket {
  const result: FieldControlInitPacket = { hubs: {}, wleds: {} };

  result.wleds['center'] = {
    address: 'ws://quad-ctr-field-7/ws',
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
    address: 'ws://uno-red-field-7/ws',
    segments: createNexusGoalSegments(fieldOptions)
  };

  result.wleds['blue'] = {
    address: 'ws://uno-blue-field-7/ws',
    segments: createNexusGoalSegments(fieldOptions)
  };

  const ensureHub = (hub: RevHub) => {
    if (result.hubs[hub] == undefined) {
      result.hubs[hub] = { motors: [], servos: [], digitalInputs: [] };
    }
  };

  for (const device of PwmDevice.ALL_PWM_DEVICES) {
    ensureHub(device.hub);
    let pulseWidth: number;
    if (device.type == 'servo') {
      if (device.alliance == 'red') {
        pulseWidth = fieldOptions.redServoHoldPositionPulseWidth;
      } else {
        pulseWidth = fieldOptions.blueServoHoldPositionPulseWidth;
      }
    } else {
      throw new UnreachableError(device.type);
    }
    result.hubs[device.hub]!.servos!.push({
      port: device.port,
      framePeriod: device.framePeriod_us,
      pulseWidth
    });
  }

  // cancelConversionButtonTriggers(result);

  return result;
}

function buildFieldFaultPacket(
  fieldOptions: FieldOptions
): FieldControlUpdatePacket {
  const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
  applyPatternToStrips('ff0000', LedStrip.ALL_STRIPS, result);
  return result;
}

function buildPrepareFieldPacket(
  fieldOptions: FieldOptions
): FieldControlUpdatePacket {
  const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
  applyPatternToStrips('ffff00', LedStrip.ALL_STRIPS, result);
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
  applyPatternToStrips('0000ff', LedStrip.ALL_BLUE_STRIPS, result);
  applyPatternToStrips('ff0000', LedStrip.ALL_RED_STRIPS, result);
  applyPatternToStrips('ff00ff', [LedStrip.RAMP], result);
  return result;
}

function buildAllClearPacket(
  fieldOptions: FieldOptions
): FieldControlUpdatePacket {
  const result: FieldControlUpdatePacket = { hubs: {}, wleds: {} };
  applyPatternToStrips('00ff00', LedStrip.ALL_STRIPS, result);
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
