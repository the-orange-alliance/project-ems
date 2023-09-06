export type HubFunctions = 'motor' | 'servo';

export interface HubParameters {
  port: number;
  setpoint?: number;
  pulsewidth?: number;
}

export interface HubMessage {
  hub: number;
  function: HubFunctions;
  parameters: HubParameters;
}

export interface FieldControlPacket {
  messages: HubMessage[];
}

export interface MotorInitParameters {
  port: number;
}

export interface ServoInitParameters {
  port: number;
  framePeriod: number;
  pulseWidth: number;
}

export interface DigitalChannelInitParameters {
  channel: number;
  isOutput: boolean;
  /**
   * Ignore / don't include when isOutput is false
   */
  high?: boolean;
}

export interface HubInitParameters {
  motors: MotorInitParameters[];
  servos: ServoInitParameters[];
  digitalChannels: DigitalChannelInitParameters[];
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
