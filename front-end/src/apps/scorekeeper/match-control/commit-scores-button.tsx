import { Button } from '@mui/material';
import { FC } from 'react';
import { useMatchControl } from '../hooks/use-match-control';
import { MatchState } from '@toa-lib/models';

export const CommitScoresButton: FC = () => {
  const { canResetField, canCommitScores, setState } = useMatchControl();
  const resetField = () => setState(MatchState.RESULTS_READY);
  const commitScores = () => setState(MatchState.RESULTS_COMMITTED);
  return canCommitScores ? (
    <Button
      fullWidth
      color='success'
      variant='contained'
      onClick={commitScores}
      disabled={!canCommitScores}
    >
      Commit Scores
    </Button>
  ) : (
    <Button
      fullWidth
      color='success'
      variant='contained'
      onClick={resetField}
      disabled={!canResetField}
    >
      All Clear
    </Button>
  );
};
