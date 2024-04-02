import { useRecoilCallback } from 'recoil';
import { useMatchControl } from './use-match-control';
import { sendStartMatch } from 'src/api/use-socket';
import { MatchState } from '@toa-lib/models';

export const useMatchStartCallback = () => {
  const { canStartMatch, setState } = useMatchControl();
  return useRecoilCallback(
    () => async () => {
      if (canStartMatch) {
        throw new Error('Attempted to start match when not allowed.');
      }
      sendStartMatch();
      setState(MatchState.MATCH_IN_PROGRESS);
    },
    [canStartMatch, setState]
  );
};
