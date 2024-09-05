import { Button } from '@mui/material';
import { FC, useState } from 'react';
import { useMatchControl } from '../hooks/use-match-control';
import {
  useAbortMatchCallback,
  useMatchStartCallback
} from '../hooks/use-start-match';
import { useSnackbar } from 'src/hooks/use-snackbar';
import { LoadingButton } from '@mui/lab';
import { useSocket } from 'src/api/use-socket';

export const StartMatchButton: FC = () => {
  const [loading, setLoading] = useState(false);
  const [, connected] = useSocket();
  const { canStartMatch, canAbortMatch } = useMatchControl();
  const startMatch = useMatchStartCallback();
  const abortMatch = useAbortMatchCallback();
  const { showSnackbar } = useSnackbar();
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
  const sendAbortMatch = async () => {
    try {
      await abortMatch();
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while prestarting', error);
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
      onClick={sendAbortMatch}
      disabled={!canAbortMatch}
    >
      Abort Match
    </Button>
  );
};
