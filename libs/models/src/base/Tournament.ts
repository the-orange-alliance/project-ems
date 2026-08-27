import { z } from 'zod';
import { isPlayoffsTournamentType, tournamentTypeZod } from './Schedule.js';
import { UnreachableError } from '../types.js';

export const tournamentZod = z.object({
  eventKey: z.string(),
  tournamentKey: z.string(),
  tournamentLevel: z.number(),
  tournamentType: tournamentTypeZod,
  fieldCount: z.number(),
  fields: z.array(z.string()),
  name: z.string()
});

export const toDatabaseZod = tournamentZod.transform((data) => ({
  ...data,
  fields: data.fields.toString()
}));

export const tournamentDatabaseZod = z
  .object({
    eventKey: z.string(),
    tournamentKey: z.string(),
    tournamentLevel: z.number(),
    tournamentType: tournamentTypeZod,
    fieldCount: z.number(),
    fields: z.string(),
    name: z.string()
  })
  .transform((data) => ({
    ...data,
    fields: data.fields.toString().split(',')
  }));

export const defaultTournament: Tournament = {
  eventKey: '',
  tournamentKey: '',
  tournamentLevel: 0,
  tournamentType: 'Test',
  fieldCount: 1,
  fields: ['Field 1'],
  name: ''
};

export const fromDatabaseJSON = (
  tournament: Tournament
): Record<string, unknown> => {
  return { ...tournament, fields: Array.from(tournament.fields) };
};

export const isPlayoffsTournament = (tournament: Tournament): boolean => {
  return isPlayoffsTournamentType(tournament.tournamentType);
};

/**
 * The span a carried card is valid for. Cards do not follow a team across the
 * boundary between these.
 */
export enum CardCarryPhase {
  QUALIFICATION = 'qualification',
  PLAYOFF = 'playoff'
}

/**
 * Which phase a card issued in this tournament carries through, or `null` if it
 * does not carry at all.
 *
 * Keyed on `tournamentType`, deliberately **not** on `tournamentLevel`. A
 * numeric threshold cannot express this rule: ranking matches are qualification
 * matches, but `RANKING_LEVEL` is 30 while `ROUND_ROBIN_LEVEL` — which is
 * playoffs — is 20, so the levels are not ordered by phase and no cutoff
 * separates them. Avoiding the level also avoids `getTournamentLevelFromType`
 * mapping `'Eliminations'` to `PRACTICE_LEVEL` (see the TODO there), which any
 * level-based check would have misread as "cards do not carry".
 *
 * The playoff arm lists exactly the types {@link isPlayoffsTournament} matches.
 * They are spelled out rather than delegated to it because it returns a plain
 * boolean, not a type guard, so calling it would leave the switch below
 * non-exhaustive and silently defeat the compile-time check that matters here.
 */
export const getCardCarryPhase = (
  tournament: Tournament
): CardCarryPhase | null => {
  switch (tournament.tournamentType) {
    case 'Test':
    case 'Practice':
      // A card here is a per-match ruling and goes nowhere.
      return null;
    case 'Qualification':
    case 'Ranking':
      // Ranking rounds *are* qualification matches.
      return CardCarryPhase.QUALIFICATION;
    case 'Round Robin':
    case 'Eliminations':
    case 'Finals':
      return CardCarryPhase.PLAYOFF;
    default:
      // Compile error if a TournamentType is added without deciding whether
      // cards carry in it. Falls back to not carrying rather than throwing —
      // this runs mid-event, and refusing to carry a card is the harmless way
      // to be wrong.
      new UnreachableError(tournament.tournamentType);
      return null;
  }
};

export type Tournament = z.infer<typeof tournamentZod>;
