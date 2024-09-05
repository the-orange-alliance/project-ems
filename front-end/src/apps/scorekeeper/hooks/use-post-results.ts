import { MatchState } from '@toa-lib/models';
import { useRecoilCallback } from 'recoil';
import { useMatchControl } from './use-match-control';
import { sendPostResults } from 'src/api/use-socket';
import {
  currentMatchIdAtom,
  matchOccurringAtom,
  socketConnectedAtom
} from 'src/stores/recoil';
import { matchesByEventKeyAtomFam } from 'src/stores/recoil';

export const usePostResultsCallback = () => {
  const { canPostResults, setState } = useMatchControl();
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
        const matches = await snapshot.getPromise(
          matchesByEventKeyAtomFam(match.eventKey)
        );
        // TODO - Filter by matches selected via fields
        const index = matches.findIndex((m) => m.id === match.id);
        // TODO - Sync results to server
        if (matches[index + 1]) {
          set(currentMatchIdAtom, matches[index + 1].id);
          set(matchOccurringAtom, matches[index + 1]);
        }
        sendPostResults();
        setState(MatchState.RESULTS_POSTED);
      },
    [canPostResults, setState]
  );
};
