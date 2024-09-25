import { Match, MatchState } from '@toa-lib/models';
import { useRecoilCallback } from 'recoil';
import { matchStateAtom, matchOccurringAtom } from 'src/stores/recoil';

export const useMatchUpdateEvent = () => {
  return useRecoilCallback(
    ({ snapshot, set }) =>
      async (newMatch: Match<any>) => {
        const state = await snapshot.getPromise(matchStateAtom);
        if (state >= MatchState.MATCH_COMPLETE) {
          // Don't update anything.
          return;
        } else {
          set(matchOccurringAtom, newMatch);
        }
      }
  );
};
