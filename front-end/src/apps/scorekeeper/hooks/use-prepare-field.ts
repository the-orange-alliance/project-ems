import { useRecoilCallback } from 'recoil';
import { useMatchControl } from './use-match-control';
import { MatchState } from '@toa-lib/models';
import { socketConnectedAtom } from 'src/stores/recoil';
import { useSeasonFieldControl } from 'src/hooks/use-season-components';

export const usePrepareFieldCallback = () => {
  const { canPrepField, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
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
        fieldControl?.prepareField?.();
        setState(MatchState.FIELD_READY);
      },
    [canPrepField, setState]
  );
};
