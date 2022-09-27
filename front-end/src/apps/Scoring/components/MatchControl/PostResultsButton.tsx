import { FC } from 'react';
import Button from '@mui/material/Button';
import { useButtonState } from '../../util/ButtonState';
import { useSetRecoilState } from 'recoil';
import { matchStateAtom } from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';
import { sendPostResults } from 'src/api/SocketProvider';

const PostResultsButton: FC = () => {
  const setState = useSetRecoilState(matchStateAtom);

  const { postResultsEnabled } = useButtonState();

  const postResults = () => {
    sendPostResults();
    setState(MatchState.RESULTS_POSTED);
  };

  return (
    <Button
      disabled={!postResultsEnabled}
      fullWidth
      variant='contained'
      onClick={postResults}
    >
      Post Results
    </Button>
  );
};

export default PostResultsButton;
