export interface MotorUpdateParameters {
  port: number;
  setpoint: number;
}

export interface ServoUpdateParameters {
  port: number;
  pulseWidth: number;
}

export interface HubUpdateParameters {
  motors?: MotorUpdateParameters[];
  servos?: ServoUpdateParameters[];
}

export interface FieldControlUpdatePacket {
  hubs: Record<number, HubUpdateParameters>;
}

export interface MotorInitParameters extends MotorUpdateParameters {}

export interface ServoInitParameters extends ServoUpdateParameters {
  framePeriod: number;
}

export interface DigitalInputInitParameters {
  channel: number;
}

export interface HubInitParameters {
  motors: MotorInitParameters[];
  servos: ServoInitParameters[];
  digitalInputs: DigitalInputInitParameters[];
}

export interface FieldControlInitPacket {
  hubs: Record<number, HubInitParameters>;
}

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
