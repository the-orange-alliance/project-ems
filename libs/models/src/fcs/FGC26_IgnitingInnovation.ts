/**
 * Field Control System (FCS) types for the 2026 Igniting Innovation season.
 *
 * The physical field hardware for this game (SUPPRESSION UNIT / EXTINGUISHER
 * LED indicators, FIRE SHIELD gate sensor, BRACE zone sensors, etc.) has not
 * been designed yet, so this is intentionally left as a minimal placeholder
 * rather than fabricated hardware telemetry. Fill in once the real field
 * electronics and control software are designed.
 */

// TODO: define real socket event names once field hardware is designed.
export enum SocketEvents {}

// TODO: define real settings once field hardware is designed.
export type SettingsType = Record<string, never>;

export const DEFAULT_SETTINGS: SettingsType = {};

// TODO: define real field status telemetry once field hardware is designed.
export type FcsStatus = Record<string, never>;
