import { useRecoilCallback } from 'recoil';
import { useMatchControl } from './use-match-control';
import { MatchState } from '@toa-lib/models';
import { matchOccurringAtom, socketConnectedAtom } from 'src/stores/recoil';
import { patchWholeMatch } from 'src/api/use-match-data';
import { recalculateRankings } from 'src/api/use-ranking-data';
import { sendCommitScores } from 'src/api/use-socket';

export const useCommitScoresCallback = () => {
  const { canCommitScores, setState } = useMatchControl();
  return useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const match = await snapshot.getPromise(matchOccurringAtom);
        const socketConnected = await snapshot.getPromise(socketConnectedAtom);
        if (!socketConnected) {
          throw new Error('Not connected to realtime service.');
        }
        if (!canCommitScores) {
          throw new Error('Attempted to commit scores when not allowed.');
        }
        if (!match) {
          throw new Error('Attempted to commit scores when there is no match.');
        }
        const { eventKey, tournamentKey, id } = match;
        await patchWholeMatch(match);
        // TODO - When to calculate rankings vs. playoff rankings?
        await recalculateRankings(eventKey, tournamentKey);
        sendCommitScores({ eventKey, tournamentKey, id });
        setState(MatchState.RESULTS_COMMITTED);
      },
    [canCommitScores, setState]
  );
};
