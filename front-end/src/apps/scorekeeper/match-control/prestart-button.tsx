import { Button } from '@mui/material';
import { FC } from 'react';
import { useMatchControl } from '../hooks/use-match-control';
import { MatchState } from '@toa-lib/models';

export const PrestartButton: FC = () => {
  const { canPrestart, canCancelPrestart, setState } = useMatchControl();
  const prestart = () => setState(MatchState.PRESTART_COMPLETE);
  const cancelPrestart = () => setState(MatchState.PRESTART_READY);
  return canPrestart ? (
    <Button
      fullWidth
      color='warning'
      variant='contained'
      onClick={prestart}
      disabled={!canPrestart}
    >
      Prestart
    </Button>
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
