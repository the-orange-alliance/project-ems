import { useRecoilCallback, useRecoilValue } from 'recoil';
import {
  currentEventKeyAtom,
  currentMatchIdAtom,
  currentTournamentKeyAtom,
  matchOccurringAtom
} from 'src/stores/recoil';
import { useMatchesForTournament } from 'src/api/use-match-data';
import { useActiveFieldNumbers } from 'src/components/sync-effects/sync-fields-to-recoil';

export const useNextUnplayedMatch = () => {
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const tournamentKey = useRecoilValue(currentTournamentKeyAtom);
  const { data: matches } = useMatchesForTournament(eventKey, tournamentKey);
  const [activeFields] = useActiveFieldNumbers();

  return useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const match = await snapshot.getPromise(matchOccurringAtom);

        if (!match) {
          return null;
        }

        // Try to find the next match and select it
        if (matches) {
          const ourMatches = matches
            .filter((m) => activeFields.includes(m.fieldNumber))
            .sort((a, b) => a.id - b.id);

          // Find the next match that hasn't had results posted
          const index = ourMatches.findIndex(
            (m) => m.id >= match.id && m.result < 0
          );
          if (ourMatches[index]) {
            return ourMatches[index];
          }
        }
        return null;
      },
    [matches, eventKey, tournamentKey, activeFields]
  );
};
