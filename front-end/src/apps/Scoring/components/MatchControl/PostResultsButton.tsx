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
  currentTournamentFieldsAtom,
  matchesByTournamentSelector,
  matchInProgressAtom,
  matchStateAtom
} from 'src/stores/NewRecoil';
import { MatchState } from '@toa-lib/models';
import { sendPostResults } from 'src/api/SocketProvider';
import { resultsSyncMatch, resultsSyncRankings } from 'src/api/ApiProvider';

const PostResultsButton: FC = () => {
  const [matchId, setMatchId] = useRecoilState(currentMatchIdAtom);
  const fields = useRecoilValue(currentTournamentFieldsAtom);
  const matches = useRecoilValue(matchesByTournamentSelector).filter((m) =>
    fields.find((f) => f.field === m.fieldNumber)
  );
  const setState = useSetRecoilState(matchStateAtom);
  const resetMatch = useResetRecoilState(matchInProgressAtom);
  const { postResultsEnabled } = useButtonState();

  const postResults = async () => {
    sendPostResults();
    setState(MatchState.RESULTS_POSTED);
    const index = matches.findIndex((m) => m.id === matchId);
    const match = matches[index];
    // Post results
    await resultsSyncMatch(match.eventKey, match.tournamentKey, match.id);
    await resultsSyncRankings(match.eventKey, match.tournamentKey);

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
