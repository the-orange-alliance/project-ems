import { FC, useState } from 'react';
import { useMatchControl } from '../hooks/use-match-control.js';
import {
  useAbortMatchCallback,
  useMatchStartCallback
} from '../hooks/use-start-match.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { Button } from 'antd';
import { useSocketWorker } from 'src/api/use-socket-worker.js';

export const StartMatchButton: FC = () => {
  const [loading, setLoading] = useState(false);
  const { connected } = useSocketWorker();
  const { canStartMatch, canAbortMatch } = useMatchControl();
  const startMatch = useMatchStartCallback();
  const abortMatch = useAbortMatchCallback();
  const { showErrorSnackbar } = useSnackbar();
  const sendStartMatch = async () => {
    setLoading(true);
    try {
      await startMatch();
      setLoading(false);
    } catch (e) {
      showErrorSnackbar('Error while starting match.', e);
      setLoading(false);
    }
  };
  const sendAbortMatch = async () => {
    try {
      await abortMatch();
    } catch (e) {
      showErrorSnackbar('Error while aborting match.', e);
    }
  };
  return canStartMatch ? (
    <Button
      type='primary'
      danger
      block
      onClick={sendStartMatch}
      disabled={!canStartMatch || loading || !connected}
      loading={loading}
    >
      Start Match
    </Button>
  ) : (
    <Button
      type='primary'
      danger
      block
      onClick={sendAbortMatch}
      disabled={!canAbortMatch}
    >
      Abort Match
    </Button>
  );
};
