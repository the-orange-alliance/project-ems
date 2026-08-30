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

/**
 * Which alliance referee tablet(s) show the EXTINGUISHER LED/ball calculator. The
 * EXTINGUISHER is a GLOBAL ALLIANCE goal, so an event can let the red ref, the blue ref,
 * or both score it from their tablets - the head referee always keeps their own control.
 */
export type ExtinguisherVisibility = 'red' | 'blue' | 'both';

// TODO: expand once field hardware is designed. For now this only carries the WILDFIRE
// LED<->ball conversion ratio (see seasons/FGC26_IgnitingInnovation.ts ledCountToBallCount /
// ballCountToLedCount), which refs need even before the physical LEDs exist, plus the
// per-field EXTINGUISHER tablet visibility.
export interface SettingsType {
  /** Balls represented by each lit WILDFIRE LED on this field. Must be >= 1. */
  wildfireBallsPerLed: number;
  /** Which alliance referee tablet(s) show the EXTINGUISHER calculator on this field. */
  extinguisherVisibility: ExtinguisherVisibility;
}

export const DEFAULT_SETTINGS: SettingsType = {
  wildfireBallsPerLed: 1,
  extinguisherVisibility: 'both'
};

// TODO: define real field status telemetry once field hardware is designed.
export type FcsStatus = Record<string, never>;
