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

export interface FieldOptions {
  motorDuration: number;
  endGameStartDuration: number;
  endGameStart: number;
  endGameHB: number;
  countdownStyle: string;
  countdownDuration: number;
  matchEndStyle: string;
  matchEndPattern: number;
  primaryColor: number;
  secondaryColor: number;
  setupDuration: number;
}

export const defaultFieldOptions: FieldOptions = {
  motorDuration: 3000,
  endGameStartDuration: 3000,
  endGameStart: 15,
  endGameHB: 15,
  countdownStyle: 'style1',
  countdownDuration: 3000,
  matchEndStyle: 'carbon',
  matchEndPattern: 1,
  primaryColor: 1965,
  secondaryColor: 1955,
  setupDuration: 10000
};
