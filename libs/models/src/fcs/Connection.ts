/**
 * Presence of field hardware (FCS) in the fcs socket room. Field clients
 * announce themselves with `fcs:identify` and re-send it whenever the state of
 * one of their devices (e.g. WLED controllers) changes.
 */
export const FcsConnectionEvents = {
  Identify: 'fcs:identify',
  GetConnection: 'fcs:getConnection',
  Connection: 'fcs:connection'
} as const;

export interface FcsIdentifyPacket {
  field?: number;
  /** Device name -> whether the field client can reach it */
  devices?: Record<string, boolean>;
}

export interface FcsFieldClient {
  field: number | null;
  devices: Record<string, boolean>;
}

export interface FcsConnectionStatus {
  connected: boolean;
  fields: FcsFieldClient[];
}

export const getOfflineDevices = (client: FcsFieldClient): string[] =>
  Object.entries(client.devices)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);
