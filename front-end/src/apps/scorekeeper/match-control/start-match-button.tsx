import { Button } from '@mui/material';
import { FC } from 'react';
import { useMatchControl } from '../hooks/use-match-control';
import { MatchState } from '@toa-lib/models';

export const StartMatchButton: FC = () => {
  const { canStartMatch, canAbortMatch, setState } = useMatchControl();
  const startMatch = () => setState(MatchState.MATCH_IN_PROGRESS);
  const abortMatch = () => setState(MatchState.PRESTART_READY);
  return canStartMatch ? (
    <Button
      fullWidth
      color='error'
      variant='contained'
      onClick={startMatch}
      disabled={!canStartMatch}
    >
      Start Match
    </Button>
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
