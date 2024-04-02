import { useRecoilCallback } from 'recoil';
import { useMatchControl } from './use-match-control';
import { MatchState } from '@toa-lib/models';
import { sendPrepareField } from 'src/api/use-socket';

export const usePrepareFieldCallback = () => {
  const { canPrepField, setState } = useMatchControl();
  return useRecoilCallback(
    () => async () => {
      if (!canPrepField) {
        throw new Error('Attempted to prepare field when not allowed.');
      }
      sendPrepareField();
      setState(MatchState.FIELD_READY);
    },
    [canPrepField, setState]
  );
};
