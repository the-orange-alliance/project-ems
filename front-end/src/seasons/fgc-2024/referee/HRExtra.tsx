import { Paper } from '@mui/material';
import {
  FeedingTheFuture,
  ItemUpdate,
  Match,
  MatchSocketEvent,
  MatchState
} from '@toa-lib/models';
import { SetterOrUpdater, useRecoilState, useRecoilValue } from 'recoil';
import { useSocket } from 'src/api/use-socket';
import { StateToggle } from 'src/components/inputs/state-toggle';
import { SyncMatchStateToRecoil } from 'src/components/sync-effects/sync-match-state-to-recoil';
import { SyncOnPrestart } from 'src/components/sync-effects/sync-on-prestart';
import { matchOccurringAtom, matchStateAtom } from 'src/stores/recoil';

const HeadRefereeExtra: React.FC = () => {
  const [socket] = useSocket();
  const matchState = useRecoilValue(matchStateAtom);
  const [match, setMatch]: [
    Match<FeedingTheFuture.MatchDetails> | null,
    SetterOrUpdater<Match<FeedingTheFuture.MatchDetails> | null>
  ] = useRecoilState(matchOccurringAtom);

  const handleMatchDetailsUpdate = <
    K extends keyof FeedingTheFuture.MatchDetails
  >(
    detailsKey: K,
    value: FeedingTheFuture.MatchDetails[K]
  ) => {
    const updatePacket: ItemUpdate = { key: String(detailsKey), value };
    socket?.emit(MatchSocketEvent.MATCH_UPDATE_DETAILS_ITEM, updatePacket);

    // Reduce UI latency by updating our local match state in anticipation
    // of the update that the server wil send soon
    if (match?.details) {
      const details = Object.assign(
        {},
        { ...match.details, [detailsKey]: value }
      );
      const newMatch = Object.assign({}, { ...match, details });
      setMatch(newMatch);
    }
  };

  return (
    <Paper
      sx={{
        padding: (theme) => theme.spacing(2),
        borderStyle: 'solid',
        borderWidth: 'thick',
        borderColor: '#981fde',
        width: '100%'
      }}
    >
      <SyncMatchStateToRecoil />
      <SyncOnPrestart />
      <StateToggle
        title={<span>Field Balanced</span>}
        states={['Unbalanced', 'Balanced']}
        value={match?.details?.fieldBalanced ?? 0}
        onChange={(v) => handleMatchDetailsUpdate('fieldBalanced', v)}
        fullWidth
        disabled={matchState !== MatchState.MATCH_COMPLETE}
      />
    </Paper>
  );
};

export default HeadRefereeExtra;
