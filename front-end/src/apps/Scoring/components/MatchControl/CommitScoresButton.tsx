import { FC, useState } from 'react';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import { useButtonState } from '../../util/ButtonState';
import { useRecoilState, useRecoilCallback } from 'recoil';
import {
  matchByMatchKey,
  matchInProgress,
  matchStateAtom
} from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';
import { sendCommitScores } from 'src/api/SocketProvider';
import { patchWholeMatch } from 'src/api/ApiProvider';

const CommitScoresButton: FC = () => {
  const [state, setState] = useRecoilState(matchStateAtom);
  const { commitEnabled } = useButtonState();
  const [loading, setLoading] = useState(false);

  const commitScores = useRecoilCallback(({ snapshot, set }) => async () => {
    const match = await snapshot.getPromise(matchInProgress);
    if (!match) return;
    setLoading(true);
    await patchWholeMatch(match);
    set(matchByMatchKey(match.matchKey), match);
    setLoading(false);
    sendCommitScores(match.matchKey);
    setState(MatchState.RESULTS_COMMITTED);
  });

  return state === MatchState.MATCH_COMPLETE ? (
    <LoadingButton
      disabled={!commitEnabled}
      fullWidth
      variant='contained'
      onClick={loading ? undefined : commitScores}
      className='yellow-bg-imp'
      loading={loading}
    >
      Commit
    </LoadingButton>
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
