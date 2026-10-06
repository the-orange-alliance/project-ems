import { Match } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { matchesAtom } from 'src/stores/state/event.js';

/**
 * The matches currently shown for a tournament: the saved matches when there
 * are any, otherwise the locally generated (not yet posted) ones.
 */
export const useScheduleMatches = (
  tournamentKey: string | undefined,
  savedMatches: Match<any>[] | undefined
): Match<any>[] => {
  const matches = useAtomValue(matchesAtom);
  return savedMatches && savedMatches.length
    ? savedMatches
    : matches.filter((m) => m.tournamentKey === tournamentKey);
};
