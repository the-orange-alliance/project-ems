import { Match } from '@toa-lib/models';
import { useSetAtom } from 'jotai';
import { matchAtom } from 'src/stores/state/event.js';

export const useMatchUpdateEvent = () => {
  const setMatch = useSetAtom(matchAtom);
  return (newMatch: Match<any>) => {
    setMatch(newMatch);
  };
};
