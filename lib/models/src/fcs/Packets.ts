import {
  FieldControlInitPacket,
  FieldControlPacket,
  HubMessage,
} from '../FieldControl.js';
import {UnreachableError} from "../types.js";

export enum RevHub {
  TOTE = 0,
  RED_HYDROGEN_TANK = 1,
  BLUE_HYDROGEN_TANK = 2,
}

export enum ConversionButtonDigitalChannel {
  RED = 0,
  BLUE = 2,
}

export const IDLE_BLINKIN_PATTERN = 1285; // COLOR_WAVES_PARTY (defined before BlinkinPattern for code organization purposes)

// TODO: Make the oxygen releaser pulse widths a setting
const OXYGEN_ACCUMULATOR_HOLDING_PULSE_WIDTH = 500;
const OXYGEN_ACCUMULATOR_RELEASED_PULSE_WIDTH = 2500;

export type PwmDeviceType = "blinkin" | "servo";
export type PwmDeviceFieldElement = "oxygenAccumulator" | "hydrogenTank" | "conversionButton" | "oxygenReleaser";

export class PwmDevice {
  public static readonly RED_OXYGEN_ACCUMULATOR_BLINKIN = new PwmDevice(RevHub.TOTE, 0, "oxygenAccumulator", "blinkin");
  public static readonly RED_CONVERSION_BUTTON_BLINKIN = new PwmDevice(RevHub.TOTE, 1, "conversionButton", "blinkin");
  public static readonly RED_OXYGEN_RELEASER_SERVO = new PwmDevice(RevHub.TOTE, 2, "oxygenReleaser", "servo");
  public static readonly RED_HYDROGEN_TANK_BLINKIN = new PwmDevice(RevHub.RED_HYDROGEN_TANK, 0, "hydrogenTank", "blinkin");
  public static readonly BLUE_OXYGEN_ACCUMULATOR_BLINKIN = new PwmDevice(RevHub.TOTE, 3, "oxygenAccumulator", "blinkin");
  public static readonly BLUE_CONVERSION_BUTTON_BLINKIN = new PwmDevice(RevHub.TOTE, 4, "conversionButton", "blinkin");
  public static readonly BLUE_OXYGEN_ACCUMULATOR_SERVO = new PwmDevice(RevHub.TOTE, 5, "oxygenReleaser", "servo");
  public static readonly BLUE_HYDROGEN_TANK_BLINKIN = new PwmDevice(RevHub.BLUE_HYDROGEN_TANK, 0, "hydrogenTank", "blinkin");

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
    PwmDevice.BLUE_OXYGEN_ACCUMULATOR_SERVO,
  ]

  public readonly hub: RevHub;
  public readonly port: number;
  public readonly framePeriod_us: number;
  public readonly initialPulseWidth_us: number;
  public readonly fieldElement: PwmDeviceFieldElement;

  private constructor(hub: RevHub, port: number, fieldElement: PwmDeviceFieldElement, deviceType: PwmDeviceType) {
    this.hub = hub;
    this.port = port;
    this.fieldElement = fieldElement;
    if (deviceType == "servo") {
      this.framePeriod_us = 20000; // Setting this high increases compatibility
      this.initialPulseWidth_us = OXYGEN_ACCUMULATOR_HOLDING_PULSE_WIDTH;
    } else if (deviceType == "blinkin") {
      this.framePeriod_us = 4000; // Setting this low reduces the max latency
      this.initialPulseWidth_us = IDLE_BLINKIN_PATTERN;
    } else {
      throw new UnreachableError(deviceType);
    }
  }
}

export interface PwmCommand {
  device: PwmDevice;
  pulseWidth_us: number | BlinkinPattern;
}

export function assemblePwmCommands(pwmCommands: PwmCommand[]): FieldControlPacket {
  const hubMessages: HubMessage[] = [];

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

  for (const command of pwmCommands) {
    hubMessages.push({
      hub: command.device.hub,
      function: "servo",
      parameters: {
        port: command.device.port,
        pulsewidth: command.pulseWidth_us,
      }
    });
  }

  return {
    messages: hubMessages
  }
}

export function createPacketToSetPatternEverywhere(pattern: BlinkinPattern, additionalCommands: PwmCommand[] = []): FieldControlPacket {
  return assemblePwmCommands([
    ...additionalCommands,
    ...PwmDevice.ALL_BLINKIN_DEVICES.map(device => {
      return { device, pulseWidth_us: pattern}
    }),
  ]);
}

export const RED_OXYGEN_ACCUMULATOR_HOLDING: PwmCommand = {
  device: PwmDevice.RED_OXYGEN_RELEASER_SERVO,
  pulseWidth_us: OXYGEN_ACCUMULATOR_HOLDING_PULSE_WIDTH,
};

export const RED_OXYGEN_ACCUMULATOR_RELEASED: PwmCommand = {
  device: PwmDevice.RED_OXYGEN_RELEASER_SERVO,
  pulseWidth_us: OXYGEN_ACCUMULATOR_RELEASED_PULSE_WIDTH,
};

export const BLUE_OXYGEN_ACCUMULATOR_HOLDING: PwmCommand = {
  device: PwmDevice.BLUE_OXYGEN_ACCUMULATOR_SERVO,
  pulseWidth_us: OXYGEN_ACCUMULATOR_HOLDING_PULSE_WIDTH,
};

export const BLUE_OXYGEN_ACCUMULATOR_RELEASED: PwmCommand = {
  device: PwmDevice.BLUE_OXYGEN_ACCUMULATOR_SERVO,
  pulseWidth_us: OXYGEN_ACCUMULATOR_RELEASED_PULSE_WIDTH,
};

export enum BlinkinPattern {
  COLOR_1_HB_FAST = 1535,
  COLOR_1_HB_MED = 1525,
  COLOR_1_HB_SLOW = 1515,
  COLOR_1_LIGHT_CHASE = 1505,
  COLOR_2_HB_FAST = 1635,
  COLOR_2_HB_MED = 1625,
  COLOR_2_HB_SLOW = 1615,
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
  STROBE_BLUE = 1455,
  STROBE_RED = 1445,
}

/**
 * This packet must specify the initial state of EVERY port that will be used at any point.
 */
export const FCS_INIT: FieldControlInitPacket = (() => {
  const result: FieldControlInitPacket = { hubs: {} };

  const ensureHub = (hub: RevHub) => {
    if (result.hubs[hub] == undefined) {
      result.hubs[hub] = { motors: [], servos: [], digitalChannels: [] }
    }
  }

  for (const device of PwmDevice.ALL_PWM_DEVICES) {
    ensureHub(device.hub);
    result.hubs[device.hub].servos.push({ port: device.port, framePeriod: device.framePeriod_us, pulseWidth: device.initialPulseWidth_us });
  }

  ensureHub(RevHub.TOTE); // The conversion buttons are in the tote
  for (let conversionButtonDigitalChannel in ConversionButtonDigitalChannel) {
    const digitalChannelNumber = Number.parseInt(conversionButtonDigitalChannel);
    if (Number.isNaN(digitalChannelNumber)) { continue; } // Filter out the string entries on the enum

    result.hubs[RevHub.TOTE].digitalChannels.push({
      channel: digitalChannelNumber,
      isOutput: false,
    });
  }

  return result;
})();

export const FCS_IDLE = createPacketToSetPatternEverywhere(IDLE_BLINKIN_PATTERN);
export const FCS_TURN_OFF_LIGHTS = createPacketToSetPatternEverywhere(BlinkinPattern.OFF);
export const FCS_FIELD_FAULT = createPacketToSetPatternEverywhere(BlinkinPattern.COLOR_GREEN);

export const FCS_PREPARE_FIELD = createPacketToSetPatternEverywhere(
    BlinkinPattern.COLOR_YELLOW,
    [
      RED_OXYGEN_ACCUMULATOR_HOLDING,
      BLUE_OXYGEN_ACCUMULATOR_HOLDING,
    ]
);
// TODO(Noah): Add a countdown
export const FCS_MATCH_START = assemblePwmCommands([
  RED_OXYGEN_ACCUMULATOR_HOLDING,
  BLUE_OXYGEN_ACCUMULATOR_HOLDING,
  { device: PwmDevice.RED_OXYGEN_ACCUMULATOR_BLINKIN, pulseWidth_us: BlinkinPattern.COLOR_RED },
  { device: PwmDevice.RED_HYDROGEN_TANK_BLINKIN, pulseWidth_us: BlinkinPattern.COLOR_RED },
  { device: PwmDevice.BLUE_OXYGEN_ACCUMULATOR_BLINKIN, pulseWidth_us: BlinkinPattern.COLOR_BLUE },
  { device: PwmDevice.BLUE_HYDROGEN_TANK_BLINKIN, pulseWidth_us: BlinkinPattern.COLOR_BLUE },
  { device: PwmDevice.RED_CONVERSION_BUTTON_BLINKIN, pulseWidth_us: BlinkinPattern.OFF },
  { device: PwmDevice.BLUE_CONVERSION_BUTTON_BLINKIN, pulseWidth_us: BlinkinPattern.OFF },
]);
export const FCS_ENDGAME = assemblePwmCommands([
  RED_OXYGEN_ACCUMULATOR_HOLDING,
  BLUE_OXYGEN_ACCUMULATOR_HOLDING,
  { device: PwmDevice.RED_OXYGEN_ACCUMULATOR_BLINKIN, pulseWidth_us: BlinkinPattern.LIGHT_CHASE_RED },
  { device: PwmDevice.RED_HYDROGEN_TANK_BLINKIN, pulseWidth_us: BlinkinPattern.LIGHT_CHASE_RED },
  { device: PwmDevice.RED_CONVERSION_BUTTON_BLINKIN, pulseWidth_us: BlinkinPattern.LIGHT_CHASE_RED },
  { device: PwmDevice.BLUE_OXYGEN_ACCUMULATOR_BLINKIN, pulseWidth_us: BlinkinPattern.LIGHT_CHASE_BLUE },
  { device: PwmDevice.BLUE_HYDROGEN_TANK_BLINKIN, pulseWidth_us: BlinkinPattern.LIGHT_CHASE_BLUE },
  { device: PwmDevice.BLUE_CONVERSION_BUTTON_BLINKIN, pulseWidth_us: BlinkinPattern.LIGHT_CHASE_BLUE },
]);
export const FCS_ALL_CLEAR = createPacketToSetPatternEverywhere(BlinkinPattern.COLOR_GREEN);

// TODO(Noah): Add optional field to FieldControlPacket that tells the device to keep polling the REV Hub digital inputs,
//             and what to do when it sees certain inputs. The field should allow specifying PWM commands to execute and
//             FCS messages to send. The device will stop polling when it receives another update command.
//             Use this to handle the red and blue combined states during endgame.
