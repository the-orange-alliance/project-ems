import { Displays } from '@toa-lib/models';
import { useAtomCallback } from 'jotai/utils';
import { displayIdAtom } from 'src/stores/state/audience-display.js';

export const useDisplayEvent = () => {
  // return useRecoilCallback(({ set, snapshot }) => async (id: number) => {
  //   // For match result, we store the currentMatchAtom to matchResultsMatchAtom to avoid the results screen updating when the match is updated.
  //   if (id === Displays.MATCH_RESULTS) {
  //     const match = await snapshot.getPromise(matchOccurringAtom);
  //     set(matchResultsMatchAtom, JSON.parse(JSON.stringify(match)));

  //     const ranks = await snapshot.getPromise(matchOccurringRanksAtom);
  //     set(matchResultsRanksAtom, JSON.parse(JSON.stringify(ranks)));
  //   }
  //   set(displayIdAtom, id);
  // });

  return useAtomCallback((get, set) => async (id: number) => {
    // For match result, we store the currentMatchAtom to matchResultsMatchAtom to avoid the results screen updating when the match is updated.
    // if (id === Displays.MATCH_RESULTS) {

    // }
    set(displayIdAtom, id);
  });
};
