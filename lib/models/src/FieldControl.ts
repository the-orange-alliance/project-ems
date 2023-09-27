//-----------------------------------------------------------------------------
// The use of generics in this file is primarily useful for enforcing that
// Field Control System clients can safely share a lot of parsing logic between
// init packets and update packets.
//-----------------------------------------------------------------------------

//-------------------------------------------
// Motor parameters
//-------------------------------------------
import { BlinkinPattern } from "./fcs/index.js";

export interface MotorUpdateParameters {
  port: number;
  setpoint: number;
}
export interface MotorInitParameters extends MotorUpdateParameters {}

//-------------------------------------------
// Servo parameters
//-------------------------------------------
export interface ServoUpdateParameters {
  port: number;
  pulseWidth: number;
}
export interface ServoInitParameters extends ServoUpdateParameters {
  framePeriod: number;
}

//-------------------------------------------
// Digital input parameters
//-------------------------------------------
export interface DigitalTriggerOptions {
  triggerOnLow: boolean;
  fcsUpdateToSend: FieldControlUpdatePacket;
}
export interface DigitalInputUpdateParameters {
  channel: number;
  triggerOptions: DigitalTriggerOptions | null; // Will disable the trigger if null
}
export interface DigitalInputInitParameters extends DigitalInputUpdateParameters {}

//-------------------------------------------
// Hub parameters
//-------------------------------------------
export interface HubParameters<M extends MotorUpdateParameters, S extends ServoUpdateParameters, DI extends DigitalInputUpdateParameters> {
  motors?: M[];
  servos?: S[];
  digitalInputs?: DI[];
}
export type HubInitParameters = HubParameters<MotorInitParameters, ServoInitParameters, DigitalInputInitParameters>;
export type HubUpdateParameters = HubParameters<MotorUpdateParameters, ServoUpdateParameters, DigitalInputUpdateParameters>;

//-------------------------------------------
// Field Control packets
//-------------------------------------------
export interface FieldControlPacket<HubParametersType extends HubParameters<any, any, any>> {
  hubs: Record<number, HubParametersType>;
}
export type FieldControlInitPacket = FieldControlPacket<HubInitParameters>;
export type FieldControlUpdatePacket = FieldControlPacket<HubUpdateParameters>;

//-------------------------------------------
// Field options
//-------------------------------------------

export interface FieldOptions {
  redServoHoldPositionPulseWidth: number;
  redServoReleasedPositionPulseWidth: number;
  blueServoHoldPositionPulseWidth: number;
  blueServoReleasedPositionPulseWidth: number;
  prepareFieldBlinkinPulseWidth: number;
  fieldFaultBlinkinPulseWidth: number;
  solidRedBlinkinPulseWidth: number;
  solidBlueBlinkinPulseWidth: number;
  allClearBlinkinPulseWidth: number;
  redEndgameOxygenGoalBlinkinPulseWidth: number;
  blueEndgameOxygenGoalBlinkinPulseWidth: number;
  redEndgameHydrogenGoalBlinkinPulseWidth: number;
  blueEndgameHydrogenGoalBlinkinPulseWidth: number;
  redEndgameButtonBlinkinPulseWidth: number;
  blueEndgameButtonBlinkinPulseWidth: number;
  redCombinedOxygenGoalBlinkinPulseWidth: number;
  blueCombinedOxygenGoalBlinkinPulseWidth: number;
  redCombinedHydrogenGoalBlinkinPulseWidth: number;
  blueCombinedHydrogenGoalBlinkinPulseWidth: number;
  redCombinedButtonBlinkinPulseWidth: number;
  blueCombinedButtonBlinkinPulseWidth: number;
}

export const defaultFieldOptions: FieldOptions = {
  redServoHoldPositionPulseWidth: 500,
  redServoReleasedPositionPulseWidth: 2500,
  blueServoHoldPositionPulseWidth: 500,
  blueServoReleasedPositionPulseWidth: 2500,
  prepareFieldBlinkinPulseWidth: BlinkinPattern.COLOR_YELLOW,
  fieldFaultBlinkinPulseWidth: BlinkinPattern.COLOR_YELLOW,
  solidRedBlinkinPulseWidth: BlinkinPattern.COLOR_RED,
  solidBlueBlinkinPulseWidth: BlinkinPattern.COLOR_BLUE,
  allClearBlinkinPulseWidth: BlinkinPattern.COLOR_GREEN,
  redEndgameOxygenGoalBlinkinPulseWidth: BlinkinPattern.COLOR_1_HB_MED,
  blueEndgameOxygenGoalBlinkinPulseWidth: BlinkinPattern.COLOR_1_HB_MED,
  redEndgameHydrogenGoalBlinkinPulseWidth: BlinkinPattern.COLOR_1_HB_MED,
  blueEndgameHydrogenGoalBlinkinPulseWidth: BlinkinPattern.COLOR_1_HB_MED,
  redEndgameButtonBlinkinPulseWidth: BlinkinPattern.COLOR_1_HB_MED,
  blueEndgameButtonBlinkinPulseWidth: BlinkinPattern.COLOR_1_HB_MED,
  redCombinedOxygenGoalBlinkinPulseWidth: BlinkinPattern.COLOR_1_2_GRADIENT,
  blueCombinedOxygenGoalBlinkinPulseWidth: BlinkinPattern.COLOR_1_2_GRADIENT,
  redCombinedHydrogenGoalBlinkinPulseWidth: BlinkinPattern.COLOR_1_2_GRADIENT,
  blueCombinedHydrogenGoalBlinkinPulseWidth: BlinkinPattern.COLOR_1_2_GRADIENT,
  redCombinedButtonBlinkinPulseWidth: BlinkinPattern.COLOR_1_2_GRADIENT,
  blueCombinedButtonBlinkinPulseWidth: BlinkinPattern.COLOR_1_2_GRADIENT,
};
