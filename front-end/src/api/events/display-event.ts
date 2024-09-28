import { Displays } from '@toa-lib/models';
import { useRecoilCallback } from 'recoil';
import {
  displayIdAtom,
  matchOccurringAtom,
  matchOccurringRanksAtom,
  matchResultsMatchAtom,
  matchResultsRanksAtom
} from 'src/stores/recoil';

export const useDisplayEvent = () => {
  return useRecoilCallback(({ set, snapshot }) => async (id: number) => {
    // For match result, we store the currentMatchAtom to matchResultsMatchAtom to avoid the results screen updating when the match is updated.
    if (id === Displays.MATCH_RESULTS) {
      const match = await snapshot.getPromise(matchOccurringAtom);
      set(matchResultsMatchAtom, JSON.parse(JSON.stringify(match)));

      const ranks = await snapshot.getPromise(matchOccurringRanksAtom);
      set(matchResultsRanksAtom, JSON.parse(JSON.stringify(ranks)));
    }
    set(displayIdAtom, id);
  });
};
