import { Button } from '@mui/material';
import { FC, useState } from 'react';
import { useMatchControl } from '../hooks/use-match-control';
import { MatchState } from '@toa-lib/models';
import { useMatchStartCallback } from '../hooks/use-start-match';
import { useSnackbar } from 'src/hooks/use-snackbar';
import { LoadingButton } from '@mui/lab';
import { sendAbortMatch, useSocket } from 'src/api/use-socket';
import { useModal } from '@ebay/nice-modal-react';
import { AbortDialog } from 'src/components/dialogs/abort-dialog';

export const StartMatchButton: FC = () => {
  const [loading, setLoading] = useState(false);
  const [, connected] = useSocket();
  const { canStartMatch, canAbortMatch, setState } = useMatchControl();
  const startMatch = useMatchStartCallback();
  const { showSnackbar } = useSnackbar();
  const abortModal = useModal(AbortDialog);
  const sendStartMatch = async () => {
    setLoading(true);
    try {
      await startMatch();
      setLoading(false);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while prestarting', error);
      setLoading(false);
    }
  };
  const abortMatch = async () => {
    const canAbort = await abortModal.show();
    if (canAbort) {
      sendAbortMatch();
      setState(MatchState.PRESTART_READY);
    }
  };
  return canStartMatch ? (
    <LoadingButton
      fullWidth
      color='error'
      variant='contained'
      onClick={sendStartMatch}
      disabled={!canStartMatch || loading || !connected}
      loading={loading}
    >
      Start Match
    </LoadingButton>
  ) : (
    <Button
      fullWidth
      color='error'
      variant='contained'
      onClick={abortMatch}
      disabled={!canAbortMatch}
    >
      Abort Match
    </Button>
  );
};
