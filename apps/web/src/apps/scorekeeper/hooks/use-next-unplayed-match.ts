import { useAtomValue } from 'jotai';
import { useAtomCallback } from 'jotai/utils';
import { useCallback } from 'react';
import { useMatchesForTournament } from 'src/api/use-match-data.js';
import { useActiveFieldNumbers } from 'src/components/sync-effects/sync-fields.js';
import {
  eventKeyAtom,
  matchAtom,
  tournamentKeyAtom
} from 'src/stores/state/event.js';

export const useNextUnplayedMatch = () => {
  const eventKey = useAtomValue(eventKeyAtom);
  const tournamentKey = useAtomValue(tournamentKeyAtom);
  const { data: matches } = useMatchesForTournament(eventKey, tournamentKey);
  const [activeFields] = useActiveFieldNumbers();

  return useAtomCallback(
    useCallback(
      (get) => {
        const match = get(matchAtom);

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
    )
  );
};
