import { Button } from '@mui/material';
import { FC, useState } from 'react';
import { useMatchControl } from '../hooks/use-match-control';
import {
  useCancelPrestartCallback,
  usePrestartCallback
} from '../hooks/use-prestart';
import { useSnackbar } from 'src/hooks/use-snackbar';
import { LoadingButton } from '@mui/lab';

export const PrestartButton: FC = () => {
  const [loading, setLoading] = useState(false);
  const { canPrestart, canCancelPrestart } = useMatchControl();
  const { showSnackbar } = useSnackbar();
  const prestart = usePrestartCallback();
  const cancelPrestart = useCancelPrestartCallback();
  const sendPrestart = async () => {
    setLoading(true);
    try {
      await prestart();
      setLoading(false);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while prestarting', error);
      setLoading(false);
    }
  };
  const sendCancelPrestart = async () => {
    try {
      await cancelPrestart();
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while cancelling prestart', error);
    }
  };
  return canPrestart ? (
    <LoadingButton
      fullWidth
      color='warning'
      variant='contained'
      onClick={sendPrestart}
      disabled={!canPrestart || loading}
      loading={loading}
    >
      Prestart
    </LoadingButton>
  ) : (
    <Button
      fullWidth
      color='error'
      variant='contained'
      onClick={sendCancelPrestart}
      disabled={!canCancelPrestart}
    >
      Cancel Prestart
    </Button>
  );
};
