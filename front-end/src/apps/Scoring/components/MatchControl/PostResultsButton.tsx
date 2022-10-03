import { FC } from 'react';
import Button from '@mui/material/Button';
import { useButtonState } from '../../util/ButtonState';
import {
  useRecoilState,
  useRecoilValue,
  useResetRecoilState,
  useSetRecoilState
} from 'recoil';
import {
  loadedMatchKey,
  matchesByTournamentType,
  matchInProgress,
  matchStateAtom,
  selectedTournamentType
} from 'src/stores/Recoil';
import { MatchState } from '@toa-lib/models';
import { sendPostResults } from 'src/api/SocketProvider';

const PostResultsButton: FC = () => {
  const [matchKey, setMatchKey] = useRecoilState(loadedMatchKey);
  const type = useRecoilValue(selectedTournamentType);
  const typeMatches = useRecoilValue(matchesByTournamentType(type));
  const setState = useSetRecoilState(matchStateAtom);
  const resetMatch = useResetRecoilState(matchInProgress);

  const { postResultsEnabled } = useButtonState();

  const postResults = () => {
    sendPostResults();
    setState(MatchState.RESULTS_POSTED);
    const index = typeMatches.findIndex((m) => m.matchKey === matchKey);
    if (typeMatches[index + 1]) {
      setMatchKey(typeMatches[index + 1].matchKey);
      resetMatch();
    }
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
