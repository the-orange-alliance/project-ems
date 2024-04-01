import { Button } from '@mui/material';
import { FC } from 'react';
import { useMatchControl } from '../hooks/use-match-control';
import { MatchState } from '@toa-lib/models';

export const DisplaysButton: FC = () => {
  const { canSetDisplays, setState } = useMatchControl();
  const setDisplays = () => setState(MatchState.AUDIENCE_READY);
  return (
    <Button
      fullWidth
      color='info'
      variant='contained'
      onClick={setDisplays}
      disabled={!canSetDisplays}
    >
      Set Displays
    </Button>
  );
};
