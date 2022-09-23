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
