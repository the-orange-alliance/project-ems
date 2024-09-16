import { MatchState } from '@toa-lib/models';
import { useRecoilCallback, useRecoilValue } from 'recoil';
import { useMatchControl } from './use-match-control';
import { sendPostResults } from 'src/api/use-socket';
import {
  currentEventKeyAtom,
  currentMatchIdAtom,
  currentTournamentKeyAtom,
  matchOccurringAtom,
  socketConnectedAtom
} from 'src/stores/recoil';
import { useSeasonFieldControl } from 'src/hooks/use-season-components';
import { useMatchesForTournament } from 'src/api/use-match-data';
import { useActiveFieldNumbers } from 'src/components/sync-effects/sync-fields-to-recoil';

export const usePostResultsCallback = () => {
  const { canPostResults, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const tournamentKey = useRecoilValue(currentTournamentKeyAtom);
  const { data: matches } = useMatchesForTournament(eventKey, tournamentKey);
  const [activeFields] = useActiveFieldNumbers();

  return useRecoilCallback(
    ({ snapshot, set }) =>
      async () => {
        const match = await snapshot.getPromise(matchOccurringAtom);
        const socketConnected = await snapshot.getPromise(socketConnectedAtom);
        if (!socketConnected) {
          throw new Error('Not connected to realtime service.');
        }
        if (!canPostResults) {
          throw new Error('Attempted to post results when not allowed.');
        }
        if (!match) {
          throw new Error('Attempted to psot results when there is no match.');
        }

        // TODO - Sync results to server

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
            set(currentMatchIdAtom, ourMatches[index].id);
            set(matchOccurringAtom, ourMatches[index]);
          } else {
            set(currentMatchIdAtom, null);
            set(matchOccurringAtom, null);
          }
        }
        fieldControl?.postResultsForField?.();
        sendPostResults();
        setState(MatchState.RESULTS_POSTED);
      },
    [canPostResults, setState, matches, eventKey, tournamentKey]
  );
};
