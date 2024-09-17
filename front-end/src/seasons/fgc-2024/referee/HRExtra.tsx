import { Divider, Grid, Paper, Typography } from '@mui/material';
import {
  Alliance,
  FeedingTheFuture,
  ItemUpdate,
  Match,
  MatchSocketEvent,
  MatchState,
  NumberAdjustment
} from '@toa-lib/models';
import { SetterOrUpdater, useRecoilState, useRecoilValue } from 'recoil';
import { useSocket } from 'src/api/use-socket';
import { NumberInput } from 'src/components/inputs/number-input';
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

  const handleMatchDetailsAdjustment = (
    detailsKey: keyof FeedingTheFuture.MatchDetails,
    adjustment: number
  ) => {
    const adjustmentPacket: NumberAdjustment = {
      key: String(detailsKey),
      adjustment
    };
    socket?.emit(
      MatchSocketEvent.MATCH_ADJUST_DETAILS_NUMBER,
      adjustmentPacket
    );

    // Reduce UI latency by updating our local match state in anticipation
    // of the update that the server wil send soon
    if (match?.details) {
      const details = Object.assign(
        {},
        {
          ...match.details,
          [detailsKey]: (match.details[detailsKey] as number) + adjustment
        }
      );
      const newMatch = Object.assign({}, { ...match, details });
      setMatch(newMatch);
    }
  };

  const handleFoodProducedChange = (
    alliance: Alliance,
    newValue: number,
    manuallyTyped: boolean
  ) => {
    if (manuallyTyped) {
      handleMatchDetailsUpdate(
        alliance === 'red' ? 'redFoodSecured' : 'blueFoodSecured',
        newValue
      );
    }
  };

  const handleFoodProducedDecrement = (alliance: Alliance) => {
    handleMatchDetailsAdjustment(
      alliance === 'red' ? 'redFoodSecured' : 'blueFoodSecured',
      -1
    );
  };

  const handleFoodProducedIncrement = (alliance: Alliance) => {
    handleMatchDetailsAdjustment(
      alliance === 'red' ? 'redFoodSecured' : 'blueFoodSecured',
      1
    );
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
      <Typography variant='h6' textAlign='center'>
        Automated Fields
      </Typography>
      <Divider sx={{ my: 1 }} />
      <Grid container direction='row' spacing={2}>
        <Grid item xs={4}>
          <Typography variant='h6' textAlign='center'>
            Red Food Produced
          </Typography>
          <NumberInput
            value={match?.details?.redFoodProduced ?? 0}
            textFieldDisabled
            disabled={matchState !== MatchState.MATCH_COMPLETE}
            onChange={(v, m) => handleFoodProducedChange('red', v, m)}
            onIncrement={(v) => handleFoodProducedIncrement('red')}
            onDecrement={(v) => handleFoodProducedDecrement('red')}
          />
        </Grid>
        <Grid item xs={4}>
          <StateToggle
            title={<span>Field Balanced</span>}
            states={['Unbalanced', 'Balanced']}
            value={match?.details?.fieldBalanced ?? 0}
            onChange={(v) => handleMatchDetailsUpdate('fieldBalanced', v)}
            fullWidth
            disabled={matchState !== MatchState.MATCH_COMPLETE}
          />
        </Grid>
        <Grid item xs={4}>
          <Typography variant='h6' textAlign='center'>
            Blue Food Produced
          </Typography>
          <NumberInput
            value={match?.details?.blueFoodProduced ?? 0}
            textFieldDisabled
            disabled={matchState !== MatchState.MATCH_COMPLETE}
            onChange={(v, m) => handleFoodProducedChange('blue', v, m)}
            onIncrement={(v) => handleFoodProducedIncrement('blue')}
            onDecrement={(v) => handleFoodProducedDecrement('blue')}
          />
        </Grid>
      </Grid>
    </Paper>
  );
};

export default HeadRefereeExtra;
