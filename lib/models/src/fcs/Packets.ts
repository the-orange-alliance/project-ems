import {
  FieldControlInitPacket,
  FieldControlUpdatePacket,
  FieldOptions,
  HubUpdateParameters,
} from "../FieldControl.js";
import {UnreachableError} from "../types.js";
import { Alliance } from "../Match.js";

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
  BLUE_HYDROGEN_TANK = 2,
}

enum ConversionButtonDigitalChannel {
  RED = 0,
  BLUE = 2,
}

const IDLE_BLINKIN_PATTERN = 1285; // COLOR_WAVES_PARTY (defined before BlinkinPattern for code organization purposes)

type PwmDeviceType = "blinkin" | "servo";
type PwmDeviceFieldElement = "oxygenAccumulator" | "hydrogenTank" | "conversionButton" | "oxygenReleaser";

class PwmDevice {
  public static readonly RED_OXYGEN_ACCUMULATOR_BLINKIN = new PwmDevice(RevHub.TOTE, 0, "red", "oxygenAccumulator", "blinkin");
  public static readonly RED_CONVERSION_BUTTON_BLINKIN = new PwmDevice(RevHub.TOTE, 1, "red", "conversionButton", "blinkin");
  public static readonly RED_OXYGEN_RELEASER_SERVO = new PwmDevice(RevHub.TOTE, 2, "red", "oxygenReleaser", "servo");
  public static readonly RED_HYDROGEN_TANK_BLINKIN = new PwmDevice(RevHub.RED_HYDROGEN_TANK, 0, "red", "hydrogenTank", "blinkin");
  public static readonly BLUE_OXYGEN_ACCUMULATOR_BLINKIN = new PwmDevice(RevHub.TOTE, 3, "blue", "oxygenAccumulator", "blinkin");
  public static readonly BLUE_CONVERSION_BUTTON_BLINKIN = new PwmDevice(RevHub.TOTE, 4, "blue", "conversionButton", "blinkin");
  public static readonly BLUE_OXYGEN_RELEASER_SERVO = new PwmDevice(RevHub.TOTE, 5, "blue", "oxygenReleaser", "servo");
  public static readonly BLUE_HYDROGEN_TANK_BLINKIN = new PwmDevice(RevHub.BLUE_HYDROGEN_TANK, 0, "blue", "hydrogenTank", "blinkin");

  public static readonly ALL_BLINKIN_DEVICES = [
    PwmDevice.RED_OXYGEN_ACCUMULATOR_BLINKIN,
    PwmDevice.RED_CONVERSION_BUTTON_BLINKIN,
    PwmDevice.RED_HYDROGEN_TANK_BLINKIN,
    PwmDevice.BLUE_OXYGEN_ACCUMULATOR_BLINKIN,
    PwmDevice.BLUE_CONVERSION_BUTTON_BLINKIN,
    PwmDevice.BLUE_HYDROGEN_TANK_BLINKIN,
  ]

  public static readonly ALL_PWM_DEVICES = [
    ...PwmDevice.ALL_BLINKIN_DEVICES,
    PwmDevice.RED_OXYGEN_RELEASER_SERVO,
    PwmDevice.BLUE_OXYGEN_RELEASER_SERVO,
  ]

  public readonly hub: RevHub;
  public readonly port: number;
  public readonly alliance: Alliance;
  public readonly type: PwmDeviceType;
  public readonly framePeriod_us: number;
  public readonly fieldElement: PwmDeviceFieldElement;

  private constructor(hub: RevHub, port: number, alliance: Alliance, fieldElement: PwmDeviceFieldElement, type: PwmDeviceType) {
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
  pulseWidth_us: number | BlinkinPattern;
}

function assemblePwmCommands(pwmCommands: PwmCommand[]): FieldControlUpdatePacket {
  // Sort the commands for optimal visual synchronization.
  // The most important thing is to have field elements of the same type grouped together.
  pwmCommands.sort((a, b) => {
    if (a.device.fieldElement == b.device.fieldElement) {
      return 0; // Elements have the same priority
    } else if (a.device.fieldElement == "hydrogenTank" || b.device.fieldElement == "hydrogenTank") {
      // Hydrogen tanks are wireless, list them first
      return a.device.fieldElement == "hydrogenTank" ? -1 : 1;
    } else if (a.device.fieldElement == "oxygenAccumulator" || b.device.fieldElement == "oxygenAccumulator") {
      // Oxygen accumulators are most prominent, list them next
      return a.device.fieldElement == "oxygenAccumulator" ? -1 : 1;
    } else if (a.device.fieldElement == "conversionButton" || b.device.fieldElement == "conversionButton") {
      // Prioritize button visual feedback over moving the servo
      return a.device.fieldElement == "conversionButton" ? -1 : 1;
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
  const hubs: Record<string, Required<Pick<HubUpdateParameters, "servos">>> = { };

  const ensureHub = (hub: RevHub) => {
    if (hubs[hub] == undefined) {
      hubs[hub] = { servos: [] }
    }
  }

  for (const command of pwmCommands) {
    ensureHub(command.device.hub);
    hubs[command.device.hub].servos.push({
      port: command.device.port,
      pulseWidth: command.pulseWidth_us,
    });
  }

  return { hubs }
}

function createPacketToSetPatternEverywhere(pattern: BlinkinPattern | number, additionalCommands: PwmCommand[] = []): FieldControlUpdatePacket {
  return assemblePwmCommands([
    ...additionalCommands,
    ...PwmDevice.ALL_BLINKIN_DEVICES.map(device => {
      return { device, pulseWidth_us: pattern}
    }),
  ]);
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
    const digitalChannelNumber = Number.parseInt(conversionButtonDigitalChannel);
    if (Number.isNaN(digitalChannelNumber)) { continue; } // Filter out the string entries on the enum

    toteHub.digitalInputs.push({
      channel: digitalChannelNumber,
      triggerOptions: null,
    });
  }
}

function createRedOxygenAccumulatorHoldingPwmCommand(fieldOptions: FieldOptions): PwmCommand {
  return {
    device: PwmDevice.RED_OXYGEN_RELEASER_SERVO,
    pulseWidth_us: fieldOptions.redServoHoldPositionPulseWidth
  };
}

function createRedOxygenAccumulatorReleasedPwmCommand(fieldOptions: FieldOptions): PwmCommand {
  return {
    device: PwmDevice.RED_OXYGEN_RELEASER_SERVO,
    pulseWidth_us: fieldOptions.redServoReleasedPositionPulseWidth,
  };
}

function createBlueOxygenAccumulatorHoldingPwmCommand(fieldOptions: FieldOptions): PwmCommand {
  return {
    device: PwmDevice.BLUE_OXYGEN_RELEASER_SERVO,
    pulseWidth_us: fieldOptions.blueServoHoldPositionPulseWidth
  };
}

function createBlueOxygenAccumulatorReleasedPwmCommand(fieldOptions: FieldOptions): PwmCommand {
  return {
    device: PwmDevice.BLUE_OXYGEN_RELEASER_SERVO,
    pulseWidth_us: fieldOptions.blueServoReleasedPositionPulseWidth,
  };
}

export enum BlinkinPattern {
  COLOR_1_2_GRADIENT = 1705,
  COLOR_1_HB_FAST = 1535,
  COLOR_1_HB_MED = 1525,
  COLOR_1_HB_SLOW = 1515,
  COLOR_1_LIGHT_CHASE = 1505,
  COLOR_1_SHOT = 1565,
  COLOR_2_HB_FAST = 1635,
  COLOR_2_HB_MED = 1625,
  COLOR_2_HB_SLOW = 1615,
  COLOR_2_SHOT = 1665,
  COLOR_AQUA = 1905,
  COLOR_BLACK = 1995,
  COLOR_BLUE = 1935,
  COLOR_BLUE_GREEN = 1895,
  COLOR_BLUE_VIOLET = 1945,
  COLOR_DARK_BLUE = 1925,
  COLOR_DARK_GRAY = 1985,
  COLOR_DARK_GREEN = 1875,
  COLOR_DARK_RED = 1795,
  COLOR_FIRE = 1215,
  COLOR_GOLD = 1835,
  COLOR_GRAY = 1975,
  COLOR_GREEN = 1885,
  COLOR_LAWN_GREEN = 1855,
  COLOR_LIME = 1865,
  COLOR_ORANGE = 1825,
  COLOR_PINK = 1785,
  COLOR_PURPLE = 1955,
  COLOR_RED = 1805,
  COLOR_RED_ORANGE = 1815,
  COLOR_SKY_BLUE = 1915,
  COLOR_VIOLET = 1955,
  COLOR_WHITE = 1965,
  COLOR_YELLOW = 1845,
  COLOR_WAVES_RAINBOW = 1275,
  COLOR_WAVES_PARTY = 1285,
  LIGHT_CHASE_RED = 1345,
  LIGHT_CHASE_BLUE = 1355,
  OFF = 1995,
  SPARKLE_COLOR_1_ON_COLOR_2 = 1685,
  SPARKLE_COLOR_2_ON_COLOR_1 = 1695,
  STROBE_BLUE = 1455,
  STROBE_RED = 1445,
}

/**
 * This packet must specify the initial state of EVERY port that will be used at any point.
 */
function buildInitPacket(fieldOptions: FieldOptions): FieldControlInitPacket {
  const result: FieldControlInitPacket = { hubs: {} };

  const ensureHub = (hub: RevHub) => {
    if (result.hubs[hub] == undefined) {
      result.hubs[hub] = { motors: [], servos: [], digitalInputs: [] }
    }
  }

  for (const device of PwmDevice.ALL_PWM_DEVICES) {
    ensureHub(device.hub);
    let pulseWidth: number;
    if (device.type == "servo") {
      if (device.alliance == "red") {
        pulseWidth = fieldOptions.redServoHoldPositionPulseWidth;
      } else {
        pulseWidth = fieldOptions.blueServoHoldPositionPulseWidth
      }
    } else if (device.type == "blinkin") {
      pulseWidth = IDLE_BLINKIN_PATTERN;
    } else {
      throw new UnreachableError(device.type);
    }
    result.hubs[device.hub]!.servos!.push({ port: device.port, framePeriod: device.framePeriod_us, pulseWidth });
  }

  cancelConversionButtonTriggers(result);

  return result;
}

function buildFieldFaultPacket(fieldOptions: FieldOptions): FieldControlUpdatePacket {
  const result = createPacketToSetPatternEverywhere(
    fieldOptions.fieldFaultBlinkinPulseWidth,
    [
      // Return any accumulated oxygen to the field for field reset
      createRedOxygenAccumulatorReleasedPwmCommand(fieldOptions),
      createBlueOxygenAccumulatorReleasedPwmCommand(fieldOptions),
    ]
  );
  cancelConversionButtonTriggers(result);
  return result;
}

function buildPrepareFieldPacket(fieldOptions: FieldOptions): FieldControlUpdatePacket {
  const result = createPacketToSetPatternEverywhere(
    fieldOptions.prepareFieldBlinkinPulseWidth,
    [
      createRedOxygenAccumulatorHoldingPwmCommand(fieldOptions),
      createBlueOxygenAccumulatorHoldingPwmCommand(fieldOptions),
    ]
  );
  cancelConversionButtonTriggers(result);
  return result;
}

function buildMatchStartPacket(fieldOptions: FieldOptions): FieldControlUpdatePacket {
  return assemblePwmCommands([
    { device: PwmDevice.RED_OXYGEN_ACCUMULATOR_BLINKIN, pulseWidth_us: fieldOptions.solidRedBlinkinPulseWidth },
    { device: PwmDevice.RED_HYDROGEN_TANK_BLINKIN, pulseWidth_us: fieldOptions.solidRedBlinkinPulseWidth },
    { device: PwmDevice.BLUE_OXYGEN_ACCUMULATOR_BLINKIN, pulseWidth_us: fieldOptions.solidBlueBlinkinPulseWidth },
    { device: PwmDevice.BLUE_HYDROGEN_TANK_BLINKIN, pulseWidth_us: fieldOptions.solidBlueBlinkinPulseWidth },
    { device: PwmDevice.RED_CONVERSION_BUTTON_BLINKIN, pulseWidth_us: BlinkinPattern.OFF },
    { device: PwmDevice.BLUE_CONVERSION_BUTTON_BLINKIN, pulseWidth_us: BlinkinPattern.OFF },
  ]);
}

function buildRedCombinedPacket(fieldOptions: FieldOptions): FieldControlUpdatePacket {
  return assemblePwmCommands([
    createRedOxygenAccumulatorReleasedPwmCommand(fieldOptions),
    { device: PwmDevice.RED_OXYGEN_ACCUMULATOR_BLINKIN, pulseWidth_us: fieldOptions.redCombinedOxygenGoalBlinkinPulseWidth },
    { device: PwmDevice.RED_HYDROGEN_TANK_BLINKIN, pulseWidth_us: fieldOptions.redCombinedHydrogenGoalBlinkinPulseWidth },
    { device: PwmDevice.RED_CONVERSION_BUTTON_BLINKIN, pulseWidth_us: fieldOptions.redCombinedButtonBlinkinPulseWidth },
  ]);
}

function buildBlueCombinedPacket(fieldOptions: FieldOptions): FieldControlUpdatePacket {
  return assemblePwmCommands([
    createBlueOxygenAccumulatorReleasedPwmCommand(fieldOptions),
    { device: PwmDevice.BLUE_OXYGEN_ACCUMULATOR_BLINKIN, pulseWidth_us: fieldOptions.blueCombinedOxygenGoalBlinkinPulseWidth },
    { device: PwmDevice.BLUE_HYDROGEN_TANK_BLINKIN, pulseWidth_us: fieldOptions.blueCombinedHydrogenGoalBlinkinPulseWidth },
    { device: PwmDevice.BLUE_CONVERSION_BUTTON_BLINKIN, pulseWidth_us: fieldOptions.blueCombinedButtonBlinkinPulseWidth },
  ]);
}

function buildEndgamePacket(fieldOptions: FieldOptions): FieldControlUpdatePacket {
  const result = assemblePwmCommands([
    { device: PwmDevice.RED_OXYGEN_ACCUMULATOR_BLINKIN, pulseWidth_us: fieldOptions.redEndgameOxygenGoalBlinkinPulseWidth },
    { device: PwmDevice.RED_HYDROGEN_TANK_BLINKIN, pulseWidth_us: fieldOptions.redEndgameHydrogenGoalBlinkinPulseWidth },
    { device: PwmDevice.RED_CONVERSION_BUTTON_BLINKIN, pulseWidth_us: fieldOptions.redEndgameButtonBlinkinPulseWidth },
    { device: PwmDevice.BLUE_OXYGEN_ACCUMULATOR_BLINKIN, pulseWidth_us: fieldOptions.blueEndgameOxygenGoalBlinkinPulseWidth },
    { device: PwmDevice.BLUE_HYDROGEN_TANK_BLINKIN, pulseWidth_us: fieldOptions.blueEndgameHydrogenGoalBlinkinPulseWidth },
    { device: PwmDevice.BLUE_CONVERSION_BUTTON_BLINKIN, pulseWidth_us: fieldOptions.blueEndgameButtonBlinkinPulseWidth },
  ]);
  result.hubs[RevHub.TOTE]!.digitalInputs = [
    {
      channel: ConversionButtonDigitalChannel.RED,
      triggerOptions: {
        triggerOnLow: true,
        fcsUpdateToSend: buildRedCombinedPacket(fieldOptions),
      }
    },
    {
      channel: ConversionButtonDigitalChannel.BLUE,
      triggerOptions: {
        triggerOnLow: true,
        fcsUpdateToSend: buildBlueCombinedPacket(fieldOptions),
      }
    }
  ];
  return result;
}

function buildMatchEndPacket(fieldOptions: FieldOptions): FieldControlUpdatePacket {
  const result = assemblePwmCommands([
    { device: PwmDevice.RED_OXYGEN_ACCUMULATOR_BLINKIN, pulseWidth_us: fieldOptions.solidRedBlinkinPulseWidth },
    { device: PwmDevice.RED_HYDROGEN_TANK_BLINKIN, pulseWidth_us: fieldOptions.solidRedBlinkinPulseWidth },
    { device: PwmDevice.BLUE_OXYGEN_ACCUMULATOR_BLINKIN, pulseWidth_us: fieldOptions.solidBlueBlinkinPulseWidth },
    { device: PwmDevice.BLUE_HYDROGEN_TANK_BLINKIN, pulseWidth_us: fieldOptions.solidBlueBlinkinPulseWidth },
    { device: PwmDevice.RED_CONVERSION_BUTTON_BLINKIN, pulseWidth_us: fieldOptions.solidRedBlinkinPulseWidth },
    { device: PwmDevice.BLUE_CONVERSION_BUTTON_BLINKIN, pulseWidth_us: fieldOptions.solidBlueBlinkinPulseWidth },
  ]);
  cancelConversionButtonTriggers(result);
  return result;
}

function buildAllClearPacket(fieldOptions: FieldOptions): FieldControlUpdatePacket {
  const result = createPacketToSetPatternEverywhere(
    fieldOptions.allClearBlinkinPulseWidth,
    [
      // Make sure that the oxygen accumulators are empty during field reset
      createRedOxygenAccumulatorReleasedPwmCommand(fieldOptions),
      createBlueOxygenAccumulatorReleasedPwmCommand(fieldOptions),
    ]);
  cancelConversionButtonTriggers(result);
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
    allClear: buildAllClearPacket(fieldOptions),
  };
}
