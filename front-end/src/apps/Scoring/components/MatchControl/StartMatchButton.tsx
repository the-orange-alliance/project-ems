import { FC, useState } from 'react';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import { useButtonState } from '../../util/ButtonState';
import { useRecoilState } from 'recoil';
import { MatchState } from '@toa-lib/models';
import {
  sendAbortMatch,
  sendStartMatch,
  useSocket
} from 'src/api/SocketProvider';
import { matchStateAtom } from 'src/stores/NewRecoil';
import { useModal } from '@ebay/nice-modal-react';
import AbortDialog from 'src/components/Dialogs/AbortDialog';

const StartMatchButton: FC = () => {
  const [state, setState] = useRecoilState(matchStateAtom);
  const [, connected] = useSocket();
  const [loading, setLoading] = useState(false);
  const { startMatchEnabled } = useButtonState();
  const abortModal = useModal(AbortDialog);

  const startMatch = async () => {
    setLoading(true);
    await updateField();
    sendStartMatch();
    setState(MatchState.MATCH_IN_PROGRESS);
    setLoading(false);
  };

  const abortMatch = async () => {
    const canAbort = await abortModal.show();
    if (canAbort) {
      sendAbortMatch();
      setState(MatchState.MATCH_ABORTED);
      setState(MatchState.PRESTART_READY);
    }
  };

  const updateField = async () => {
    setLoading(true);
    setState(MatchState.FIELD_READY);
    setState(MatchState.MATCH_READY);
    setLoading(false);
  };

  return state === MatchState.MATCH_IN_PROGRESS ? (
    <Button
      disabled={!startMatchEnabled}
      color='error'
      fullWidth
      variant='contained'
      onClick={abortMatch}
    >
      Abort Match
    </Button>
  ) : (
    <LoadingButton
      disabled={!startMatchEnabled || !connected}
      color='error'
      fullWidth
      variant='contained'
      onClick={startMatch}
      loading={loading}
    >
      Start Match
    </LoadingButton>
  );
};

export default StartMatchButton;
