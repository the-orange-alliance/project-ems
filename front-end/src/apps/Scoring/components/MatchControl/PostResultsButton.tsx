import { FC } from 'react';
import Button from '@mui/material/Button';
import { useButtonState } from '../../util/ButtonState';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  loadedMatchKey,
  matchesByTournamentType,
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

  const { postResultsEnabled } = useButtonState();

  const postResults = () => {
    sendPostResults();
    setState(MatchState.RESULTS_POSTED);
    const index = typeMatches.findIndex((m) => m.matchKey === matchKey);
    if (typeMatches[index + 1]) {
      setMatchKey(typeMatches[index + 1].matchKey);
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
