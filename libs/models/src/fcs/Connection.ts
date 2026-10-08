/**
 * Presence of field hardware (FCS) in the fcs socket room. Fields report
 * `fcs:status` periodically; the realtime server treats a field as connected
 * while those keep arriving and pulls WLED states out of them.
 */
export const FcsConnectionEvents = {
  GetConnection: 'fcs:getConnection',
  Connection: 'fcs:connection'
} as const;

export interface FcsFieldClient {
  field: number | null;
  /** Device name -> whether the field client can reach it */
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

const asObject = (data: unknown): Record<string, unknown> | null => {
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : null;
};

/**
 * Reads the field number and WLED states out of an `fcs:status` packet. Fields
 * send it as a JSON string or object, and each season names its WLEDs
 * differently (`redConnected`, `goalConnected`, ...), so this only relies on
 * the `<name>Connected` convention. Anything else in the packet is ignored.
 */
export const parseFcsStatusClient = (status: unknown): FcsFieldClient => {
  const packet = asObject(status);
  const field = typeof packet?.field === 'number' ? packet.field : null;
  const devices: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(asObject(packet?.wled) ?? {})) {
    const match = /^(.+)Connected$/.exec(key);
    if (match && typeof value === 'boolean') {
      const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      devices[`${name} LEDs`] = value;
    }
  }
  return { field, devices };
};
