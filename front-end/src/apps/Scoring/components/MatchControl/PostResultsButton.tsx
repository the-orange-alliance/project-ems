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
  currentMatchIdAtom,
  matchesByTournamentSelector,
  matchInProgressAtom,
  matchStateAtom
} from 'src/stores/NewRecoil';
import { MatchState } from '@toa-lib/models';
import { sendPostResults } from 'src/api/SocketProvider';

const PostResultsButton: FC = () => {
  const [matchId, setMatchId] = useRecoilState(currentMatchIdAtom);
  const matches = useRecoilValue(matchesByTournamentSelector);
  const setState = useSetRecoilState(matchStateAtom);
  const resetMatch = useResetRecoilState(matchInProgressAtom);

  const { postResultsEnabled } = useButtonState();

  const postResults = () => {
    sendPostResults();
    setState(MatchState.RESULTS_POSTED);
    // const filteredMatches = matches.filter(
    //   (m) => fields.indexOf(m.fieldNumber) > -1
    // );
    const index = matches.findIndex((m) => m.id === matchId);
    // if (filteredMatches[index + 1]) {
    //   setMatchId(filteredMatches[index + 1].matchKey);
    //   resetMatch();
    // }
    if (matches[index + 1]) {
      setMatchId(matches[index + 1].id);
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
