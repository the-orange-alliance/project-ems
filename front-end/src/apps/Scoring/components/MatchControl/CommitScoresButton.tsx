import { FC } from 'react';
import Button from '@mui/material/Button';
import { useButtonState } from '../../util/ButtonState';
import { useSetRecoilState } from 'recoil';
import { matchStateAtom } from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';

const CommitScoresButton: FC = () => {
  const setState = useSetRecoilState(matchStateAtom);

  const { commitEnabled } = useButtonState();

  const commitScores = () => {
    setState(MatchState.RESULTS_COMMITTED);
  };

  return (
    <Button
      disabled={!commitEnabled}
      fullWidth
      variant='contained'
      onClick={commitScores}
    >
      Commit
    </Button>
  );
};

export default CommitScoresButton;
