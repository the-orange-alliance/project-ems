import { Match } from '@toa-lib/models';
import { useAtomCallback } from 'jotai/utils';
import { matchAtom } from 'src/stores/state/event.js';

export const useMatchUpdateEvent = () => {
  return useAtomCallback((get, set) => async (newMatch: Match<any>) => {
    set(matchAtom, newMatch);
  });
};
