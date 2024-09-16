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
import { matchesByEventKeyAtomFam } from 'src/stores/recoil';
import { useSeasonFieldControl } from 'src/hooks/use-season-components';
import { useMatchesForTournament } from 'src/api/use-match-data';

export const usePostResultsCallback = () => {
  const { canPostResults, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const tournamentKey = useRecoilValue(currentTournamentKeyAtom);
  const { data: matches } = useMatchesForTournament(eventKey, tournamentKey);
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
          // TODO - Filter by matches selected via fields
          const index = matches.findIndex((m) => m.id === match.id);
          if (matches[index + 1]) {
            set(currentMatchIdAtom, matches[index + 1].id);
            set(matchOccurringAtom, matches[index + 1]);
          }
        }
        fieldControl?.postResultsForField?.();
        sendPostResults();
        setState(MatchState.RESULTS_POSTED);
      },
    [canPostResults, setState, matches, eventKey, tournamentKey]
  );
};
