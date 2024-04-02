import { Button } from '@mui/material';
import { FC, useState } from 'react';
import { useMatchControl } from '../hooks/use-match-control';
import { MatchState } from '@toa-lib/models';
import { usePrestartCallback } from '../hooks/use-prestart';
import { useSnackbar } from 'src/hooks/use-snackbar';
import { LoadingButton } from '@mui/lab';

export const PrestartButton: FC = () => {
  const [loading, setLoading] = useState(false);
  const { canPrestart, canCancelPrestart, setState } = useMatchControl();
  const { showSnackbar } = useSnackbar();
  const prestart = usePrestartCallback();
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
  const cancelPrestart = () => setState(MatchState.PRESTART_READY);
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
      onClick={cancelPrestart}
      disabled={!canCancelPrestart}
    >
      Cancel Prestart
    </Button>
  );
};
