import { Button } from '@mui/material';
import { FC } from 'react';
import { useMatchControl } from '../hooks/use-match-control';
import { MatchState } from '@toa-lib/models';

export const PostResultsButton: FC = () => {
  const { canPostResults, setState } = useMatchControl();
  const postResults = () => setState(MatchState.RESULTS_POSTED);
  return (
    <Button
      fullWidth
      color='success'
      variant='contained'
      onClick={postResults}
      disabled={!canPostResults}
    >
      Post Results
    </Button>
  );
};
