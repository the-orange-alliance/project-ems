import { useRecoilCallback } from 'recoil';
import { useMatchControl } from './use-match-control';
import { MatchState } from '@toa-lib/models';
import { sendPrepareField } from 'src/api/use-socket';
import { socketConnectedAtom } from 'src/stores/recoil';

export const usePrepareFieldCallback = () => {
  const { canPrepField, setState } = useMatchControl();
  return useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const socketConnected = await snapshot.getPromise(socketConnectedAtom);
        if (!socketConnected) {
          throw new Error('Not connected to realtime service.');
        }
        if (!canPrepField) {
          throw new Error('Attempted to prepare field when not allowed.');
        }
        sendPrepareField();
        setState(MatchState.FIELD_READY);
      },
    [canPrepField, setState]
  );
};
