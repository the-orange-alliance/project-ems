//-----------------------------------------------------------------------------
// The use of generics in this file is primarily useful for enforcing that
// Field Control System clients can safely share a lot of parsing logic between
// init packets and update packets.
//-----------------------------------------------------------------------------

//-------------------------------------------
// Motor parameters
//-------------------------------------------
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
export interface DigitalInputInitParameters
  extends DigitalInputUpdateParameters {}
export interface DigitalInputsResult {
  hubs: Record<number, number>;
}

//-------------------------------------------
// Hub parameters
//-------------------------------------------
export interface HubParameters<
  M extends MotorUpdateParameters,
  S extends ServoUpdateParameters,
  DI extends DigitalInputUpdateParameters
> {
  motors?: M[];
  servos?: S[];
  digitalInputs?: DI[];
}
export type HubInitParameters = HubParameters<
  MotorInitParameters,
  ServoInitParameters,
  DigitalInputInitParameters
>;
export type HubUpdateParameters = HubParameters<
  MotorUpdateParameters,
  ServoUpdateParameters,
  DigitalInputUpdateParameters
>;

//-------------------------------------------
// WLED parameters
//-------------------------------------------
export interface LedPatternUpdateParameters {
  segment: number;
  color: string;
  subset?: {
    startIndex: number;
    endIndex: number;
  };
}

export interface LedSegment {
  start: number;
  stop: number;
}

export interface WledInitParameters {
  address: string;
  segments: LedSegment[];
}

export interface WledUpdateParameters {
  patterns: LedPatternUpdateParameters[];
}

//-------------------------------------------
// Field Control packets
//-------------------------------------------
export interface FieldControlPacket<
  HubParametersType extends HubParameters<any, any, any>,
  WledParametersType
> {
  hubs: Record<number, HubParametersType>;
  wleds: Record<string, WledParametersType>;
}
export type FieldControlInitPacket = FieldControlPacket<
  HubInitParameters,
  WledInitParameters
>;
export type FieldControlUpdatePacket = FieldControlPacket<
  HubUpdateParameters,
  WledUpdateParameters
>;
