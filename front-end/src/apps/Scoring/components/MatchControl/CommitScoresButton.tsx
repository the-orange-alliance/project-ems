import { FC } from 'react';
import Button from '@mui/material/Button';
import { useButtonState } from '../../util/ButtonState';
import { useRecoilState } from 'recoil';
import { matchStateAtom } from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';
import { commitScoresLED } from 'src/api/SocketProvider';

const CommitScoresButton: FC = () => {
  const [state, setState] = useRecoilState(matchStateAtom);

  const { commitEnabled } = useButtonState();

  const commitScores = async () => {
    setState(MatchState.RESULTS_COMMITTED);
    await commitScoresLED();
  };

  return state === MatchState.MATCH_COMPLETE ? (
    <Button
      disabled={!commitEnabled}
      fullWidth
      variant='contained'
      onClick={commitScores}
      className='yellow-bg-imp'
    >
      Commit
    </Button>
  ) : (
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
