import { Match } from '@toa-lib/models';
import { useRecoilCallback } from 'recoil';
import { matchOccurringAtom } from 'src/stores/recoil';

export const useMatchUpdateEvent = () => {
  return useRecoilCallback(({ set }) => async (newMatch: Match<any>) => {
    set(matchOccurringAtom, newMatch);
  });
};
