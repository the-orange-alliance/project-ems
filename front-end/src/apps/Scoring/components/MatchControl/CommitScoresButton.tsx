import { FC, useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import { useButtonState } from '../../util/ButtonState';
import { useRecoilCallback, useRecoilState } from 'recoil';
import {
  matchByMatchKey,
  matchInProgress,
  matchStateAtom
} from 'src/stores/Recoil';
import { Match, MatchState } from '@toa-lib/models';
import { sendAllClear, sendCommitScores } from 'src/api/SocketProvider';
import { patchWholeMatch, recalculateRankings } from 'src/api/ApiProvider';

const CommitScoresButton: FC = () => {
  const [state, setState] = useRecoilState(matchStateAtom);
  const { commitEnabled } = useButtonState();
  const [cleared, setCleared] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (state >= MatchState.RESULTS_POSTED) {
      setCleared(false);
    }
  }, [state]);

  const onClear = () => {
    setCleared(true);
    sendAllClear();
  };

  const commitScores = useRecoilCallback(({ snapshot, set }) => async () => {
    const oldMatch = await snapshot.getPromise(matchInProgress);
    if (!oldMatch || !oldMatch.details || !oldMatch.participants) return;
    const match: Match = { ...oldMatch, result: 0 };
    setLoading(true);
    await patchWholeMatch(match);
    set(matchByMatchKey(match.matchKey), match);
    await recalculateRankings(match.tournamentLevel);
    setLoading(false);
    sendCommitScores(match.matchKey);
    setState(MatchState.RESULTS_COMMITTED);
  });

  return !cleared ? (
    <Button
      disabled={!commitEnabled}
      className='yellow-bg'
      variant='contained'
      fullWidth
      onClick={onClear}
    >
      All Clear
    </Button>
  ) : (
    <LoadingButton
      disabled={!commitEnabled}
      fullWidth
      variant='contained'
      onClick={loading ? undefined : commitScores}
      className='yellow-bg'
      loading={loading}
    >
      Commit
    </LoadingButton>
  );
};

export default CommitScoresButton;
