import { FC, useState } from 'react';
import { useMatchControl } from '../hooks/use-match-control.js';
import {
  useClearFieldCallback,
  useCommitScoresCallback
} from '../hooks/use-commit-scores.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { Button } from 'antd';

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
      const error =
        e instanceof Error
          ? `${e.name} ${e.message}\\n(${e.cause})`
          : String(e);
      showSnackbar('Error while committing scores', error);
      setLoading(false);
    }
  };
  return canCommitScores ? (
    <Button
      type='primary'
      block
      onClick={sendCommitScores}
      disabled={!canCommitScores || loading}
      loading={loading}
      style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
    >
      Commit Scores
    </Button>
  ) : (
    <Button
      type='primary'
      block
      onClick={sendResetField}
      disabled={!canResetField}
      style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
    >
      All Clear
    </Button>
  );
};
