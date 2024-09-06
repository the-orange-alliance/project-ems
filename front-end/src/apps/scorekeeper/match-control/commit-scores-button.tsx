import { Button } from '@mui/material';
import { FC, useState } from 'react';
import { useMatchControl } from '../hooks/use-match-control';
import {
  useClearFieldCallback,
  useCommitScoresCallback
} from '../hooks/use-commit-scores';
import { useSnackbar } from 'src/hooks/use-snackbar';
import { LoadingButton } from '@mui/lab';

export const CommitScoresButton: FC = () => {
  const [loading, setLoading] = useState(false);
  const { canResetField, canCommitScores } = useMatchControl();
  const commitScores = useCommitScoresCallback();
  const clearField = useClearFieldCallback();
  const { showSnackbar } = useSnackbar();
  const sendResetField = async () => {
    try {
      await clearField();
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while clearing field', error);
    }
  };
  const sendCommitScores = async () => {
    setLoading(true);
    try {
      await commitScores();
      setLoading(false);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while committing scores', error);
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
      onClick={sendResetField}
      disabled={!canResetField}
    >
      All Clear
    </Button>
  );
};
