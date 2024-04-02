import { Button } from '@mui/material';
import { FC, useState } from 'react';
import { useMatchControl } from '../hooks/use-match-control';
import { MatchState } from '@toa-lib/models';
import { useCommitScoresCallback } from '../hooks/use-commit-scores';
import { useSnackbar } from 'src/hooks/use-snackbar';
import { LoadingButton } from '@mui/lab';
import { sendAllClear } from 'src/api/use-socket';

export const CommitScoresButton: FC = () => {
  const [loading, setLoading] = useState(false);
  const { canResetField, canCommitScores, setState } = useMatchControl();
  const commitScores = useCommitScoresCallback();
  const { showSnackbar } = useSnackbar();
  const resetField = () => {
    sendAllClear();
    setState(MatchState.RESULTS_READY);
  };
  const sendCommitScores = async () => {
    setLoading(true);
    try {
      await commitScores();
      setLoading(false);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while prestarting', error);
      setLoading(false);
    }
  };
  return canCommitScores ? (
    <LoadingButton
      fullWidth
      color='success'
      variant='contained'
      onClick={sendCommitScores}
      disabled={!canCommitScores || loading}
      loading={loading}
    >
      Commit Scores
    </LoadingButton>
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
