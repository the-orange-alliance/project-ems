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

export type PrepFieldMotor = 'door' | 'blowers';

export type PrepFieldBranchStep =
  | { type: 'motor'; motor: PrepFieldMotor; power: number; duration: number }
  | { type: 'wait'; duration: number };

export type PrepFieldStep =
  | PrepFieldBranchStep
  | { type: 'parallel'; branches: PrepFieldBranchStep[][] };

// Mirrored from FCS
export const PREP_FIELD_MAX_STEPS = 100;
export const PREP_FIELD_MAX_BRANCHES = 8;
export const PREP_FIELD_MAX_STEP_DURATION = 30; // seconds
export const PREP_FIELD_MAX_TOTAL_DURATION = 60; // seconds

// TODO: expand once field hardware is designed. For now this only carries the WILDFIRE
// LED<->ball conversion ratio (see seasons/FGC26_IgnitingInnovation.ts ledCountToBallCount /
// ballCountToLedCount), which refs need even before the physical LEDs exist, plus the
// per-field EXTINGUISHER tablet visibility.
export interface SettingsType {
  /** Balls represented by each lit WILDFIRE LED on this field. Must be >= 1. */
  wildfireBallsPerLed: number;
  /** Which alliance referee tablet(s) show the EXTINGUISHER calculator on this field. */
  extinguisherVisibility: ExtinguisherVisibility;
  /** Sequence the field robot runs on "prepare field" (trap door + leaf blowers). */
  prepFieldSequence: PrepFieldStep[];
}

export const DEFAULT_SETTINGS: SettingsType = {
  wildfireBallsPerLed: 1,
  extinguisherVisibility: 'both',
  // Mirrors the robot's hardcoded fallback: open the door, then three blower
  // bursts with one-second gaps.
  prepFieldSequence: [
    { type: 'motor', motor: 'door', power: 0.25, duration: 1.0 },
    { type: 'motor', motor: 'blowers', power: 0.1, duration: 1.0 },
    { type: 'wait', duration: 1.0 },
    { type: 'motor', motor: 'blowers', power: 0.1, duration: 1.0 },
    { type: 'wait', duration: 1.0 },
    { type: 'motor', motor: 'blowers', power: 0.1, duration: 1.0 }
  ]
};

/** Nominal duration of a valid sequence in seconds (parallel = longest branch). */
export const prepFieldSequenceDuration = (steps: PrepFieldStep[]): number =>
  steps.reduce(
    (total, step) =>
      total +
      (step.type === 'parallel'
        ? Math.max(
            ...step.branches.map((branch) =>
              branch.reduce((sum, s) => sum + s.duration, 0)
            )
          )
        : step.duration),
    0
  );

// TODO: define real field status telemetry once field hardware is designed.
export type FcsStatus = Record<string, never>;
