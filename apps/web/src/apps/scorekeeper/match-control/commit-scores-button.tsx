import { FC, useState } from 'react';
import { useMatchControl } from '../hooks/use-match-control.js';
import {
  useClearFieldCallback,
  useCommitScoresCallback
} from '../hooks/use-commit-scores.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { Button } from 'antd';
import { CheckCircleOutlined, SaveOutlined } from '@ant-design/icons';

export const CommitScoresButton: FC = () => {
  const [loading, setLoading] = useState(false);
  const { canResetField, canCommitScores } = useMatchControl();
  const commitScores = useCommitScoresCallback();
  const clearField = useClearFieldCallback();
  const { showErrorSnackbar } = useSnackbar();
  const sendResetField = async () => {
    try {
      await clearField();
    } catch (e) {
      showErrorSnackbar('Error while clearing field.', e);
    }
  };
  const sendCommitScores = async () => {
    setLoading(true);
    try {
      await commitScores();
      setLoading(false);
    } catch (e) {
      showErrorSnackbar('Error while committing scores.', e);
      setLoading(false);
    }
  };
  return canCommitScores ? (
    <Button
      color='green'
      variant='solid'
      size='large'
      block
      icon={<SaveOutlined />}
      onClick={sendCommitScores}
      disabled={!canCommitScores || loading}
      loading={loading}
    >
      Commit Scores
    </Button>
  ) : (
    <Button
      color='green'
      variant='solid'
      size='large'
      block
      icon={<CheckCircleOutlined />}
      onClick={sendResetField}
      disabled={!canResetField}
    >
      All Clear
    </Button>
  );
};
