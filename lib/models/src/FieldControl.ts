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
// TODO(Noah): Set triggerOptions to null for most field packets
export type FieldControlUpdatePacket = FieldControlPacket<HubUpdateParameters>;

//-------------------------------------------
// Field options
//-------------------------------------------

export interface FieldOptions {
  motorDuration: number;
  endGameHB: number;
  countdownStyle: string;
  countdownDuration: number;
  matchEndStyle: string;
  matchEndPattern: number;
  primaryColor: number;
  secondaryColor: number;
  setupDuration: number;
  motorReverseDuration: number;
}

export const defaultFieldOptions: FieldOptions = {
  motorDuration: 3000,
  endGameHB: 15,
  countdownStyle: 'style1',
  countdownDuration: 3000,
  matchEndStyle: 'carbon',
  matchEndPattern: 1,
  primaryColor: 1965,
  secondaryColor: 1955,
  setupDuration: 10000,
  motorReverseDuration:3000,
};
