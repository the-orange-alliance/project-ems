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

/**
 * Validates a prep-field sequence, mirroring the field robot's rules. Returns
 * an error description, or null if valid. An empty array is valid ("do
 * nothing on prepare field").
 */
export const validatePrepFieldSequence = (value: unknown): string | null => {
  if (!Array.isArray(value)) return 'sequence must be a JSON array';
  if (value.length > PREP_FIELD_MAX_STEPS) {
    return `too many steps (${value.length} > ${PREP_FIELD_MAX_STEPS})`;
  }

  const validateLeaf = (step: any, where: string): string | null => {
    if (step === null || typeof step !== 'object' || Array.isArray(step)) {
      return `${where} must be an object`;
    }
    if (step.type === 'motor') {
      if (step.motor !== 'door' && step.motor !== 'blowers') {
        return `${where} unknown motor '${step.motor}' (use "door" or "blowers")`;
      }
      if (
        typeof step.power !== 'number' ||
        !Number.isFinite(step.power) ||
        Math.abs(step.power) > 1
      ) {
        return `${where} power must be a number in [-1, 1]`;
      }
    } else if (step.type !== 'wait') {
      return `${where} unknown type '${step.type}' (use "motor", "wait" or "parallel")`;
    }
    if (
      typeof step.duration !== 'number' ||
      !Number.isFinite(step.duration) ||
      step.duration <= 0 ||
      step.duration > PREP_FIELD_MAX_STEP_DURATION
    ) {
      return `${where} duration must be in (0, ${PREP_FIELD_MAX_STEP_DURATION}] seconds`;
    }
    return null;
  };

  for (let i = 0; i < value.length; i++) {
    const step = value[i];
    const where = `step ${i}`;
    if (step !== null && typeof step === 'object' && step.type === 'parallel') {
      if (!Array.isArray(step.branches) || step.branches.length === 0) {
        return `${where} parallel needs a non-empty "branches" array of step arrays`;
      }
      if (step.branches.length > PREP_FIELD_MAX_BRANCHES) {
        return `${where} parallel has too many branches (max ${PREP_FIELD_MAX_BRANCHES})`;
      }
      for (let b = 0; b < step.branches.length; b++) {
        const branch = step.branches[b];
        if (!Array.isArray(branch) || branch.length === 0) {
          return `${where} branch ${b} must be a non-empty array of steps`;
        }
        for (let j = 0; j < branch.length; j++) {
          const branchWhere = `${where} branch ${b} step ${j}`;
          if (branch[j]?.type === 'parallel') {
            return `${branchWhere} nests parallel inside parallel`;
          }
          const error = validateLeaf(branch[j], branchWhere);
          if (error) return error;
        }
      }
    } else {
      const error = validateLeaf(step, where);
      if (error) return error;
    }
  }

  const total = prepFieldSequenceDuration(value as PrepFieldStep[]);
  if (total > PREP_FIELD_MAX_TOTAL_DURATION) {
    return `total duration ${total}s exceeds ${PREP_FIELD_MAX_TOTAL_DURATION}s`;
  }
  return null;
};

// TODO: define real field status telemetry once field hardware is designed.
export type FcsStatus = Record<string, never>;
