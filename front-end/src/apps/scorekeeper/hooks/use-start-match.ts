import { useRecoilCallback } from 'recoil';
import { useMatchControl } from './use-match-control';
import { sendAbortMatch, sendStartMatch } from 'src/api/use-socket';
import { MatchState } from '@toa-lib/models';
import { socketConnectedAtom } from 'src/stores/recoil';
import { useSeasonFieldControl } from 'src/hooks/use-season-components';
import { useModal } from '@ebay/nice-modal-react';
import { AbortDialog } from 'src/components/dialogs/abort-dialog';

export const useMatchStartCallback = () => {
  const { canStartMatch, setState } = useMatchControl();
  const fieldControl = useSeasonFieldControl();
  return useRecoilCallback(
    ({ snapshot }) =>
      async () => {
        const socketConnected = await snapshot.getPromise(socketConnectedAtom);
        if (!socketConnected) {
          throw new Error('Not connected to realtime service.');
        }
        if (!canStartMatch) {
          throw new Error('Attempted to start match when not allowed.');
        }
        fieldControl?.startField?.();
        sendStartMatch();
        setState(MatchState.MATCH_IN_PROGRESS);
      },
    [canStartMatch, setState]
  );
};

export const useAbortMatchCallback = () => {
  const { canAbortMatch, setState } = useMatchControl();
  const abortModal = useModal(AbortDialog);
  const fieldControl = useSeasonFieldControl();
  return useRecoilCallback(() => async () => {
    if (!canAbortMatch) {
      throw new Error('Attempted to abort match when not allowed.');
    }
    const canAbort = await abortModal.show();
    if (!canAbort) return;
    fieldControl?.abortField?.();
    sendAbortMatch();
    setState(MatchState.PRESTART_READY);
  });
};
