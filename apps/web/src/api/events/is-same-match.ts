import { MatchKey } from '@toa-lib/models';

/**
 * Whether the given (possibly null) match refers to the same match as key.
 * Used to drop delayed fetch responses once a newer match owns the state.
 */
export const isSameMatch = (
  match: MatchKey | null | undefined,
  key: MatchKey
): boolean =>
  !!match &&
  match.eventKey === key.eventKey &&
  match.tournamentKey === key.tournamentKey &&
  match.id === key.id;
