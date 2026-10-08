import { z } from 'zod';
import { tournamentTypeZod } from './Schedule.js';

/**
 * Whether a committed match set the high score for its phase.
 *
 * "Phase" is the `CardCarryPhase` grouping from `Tournament.ts`, NOT the
 * tournament level: qualification-style tournaments share one record and
 * playoff-style tournaments share another. Playoff alliances are stacked and
 * post much higher scores, so a single combined record would freeze the
 * qualification record the moment playoffs begin.
 *
 * Eligibility mirrors the ranking convention: an alliance whose participants
 * include a disqualification or a red card cannot hold the record, because a
 * card does not zero the stored `redScore`/`blueScore` - seasons apply cards
 * when calculating rankings, not when scoring the match.
 *
 * THIS LIVES IN ITS OWN MODULE ON PURPOSE. It belongs with the match model, but
 * `Schedule.ts` imports the match-level constants out of `Match.ts`, so a value
 * import of `tournamentTypeZod` from there is a cycle: whichever of the two
 * evaluates second sees the other half-initialized, and building this schema at
 * module scope threw "Cannot access 'tournamentTypeZod' before initialization".
 * Keeping it downstream of both files avoids the cycle entirely.
 */
export const matchHighScoreZod = z.object({
  /** True when this match's best eligible alliance score beats every other played match in its phase. */
  isNewHighScore: z.boolean(),
  /** The alliance that set it. `null` when none did, or when red and blue tied at the record. */
  alliance: z.enum(['red', 'blue']).nullable(),
  /** The record-setting score, or `null` when this match set no record. */
  score: z.number().nullable(),
  /** Best eligible score among the phase's other played matches, or `null` when this is the first. */
  previousScore: z.number().nullable(),
  /** This match's tournament type, so a display can gate on it without a second request. */
  tournamentType: tournamentTypeZod
});

export type MatchHighScore = z.infer<typeof matchHighScoreZod>;
