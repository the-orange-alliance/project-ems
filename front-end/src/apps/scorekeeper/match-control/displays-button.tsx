import { Button } from '@mui/material';
import { FC } from 'react';
import { useMatchControl } from '../hooks/use-match-control';
import { MatchState } from '@toa-lib/models';
import { setDisplays } from 'src/api/use-socket';

export const DisplaysButton: FC = () => {
  const { canSetDisplays, setState } = useMatchControl();
  const updateDisplays = () => {
    setDisplays();
    setState(MatchState.AUDIENCE_READY);
  };
  return (
    <Button
      fullWidth
      color='info'
      variant='contained'
      onClick={updateDisplays}
      disabled={!canSetDisplays}
    >
      Set Displays
    </Button>
  );
};
