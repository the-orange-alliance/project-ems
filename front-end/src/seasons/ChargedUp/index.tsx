import { FC } from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { MatchDetailInfoProps, SeasonComponents } from '..';
import { ChargedUpDetails } from '@toa-lib/models';
import ScoreSheet from '@seasons/ChargedUp/referee/ScoreSheet';

const MatchDetailInfo: FC<MatchDetailInfoProps<ChargedUpDetails>> = ({
  match,
  handleUpdates
}) => {
  if (!match || !match.details) return null;
  const { details } = match;
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={6}>
        <TextField
          label='Tournament ID'
          value={match?.tournamentKey}
          disabled
          fullWidth
          name='matchKey'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6}>
        <TextField
          label='Match ID'
          value={match?.id}
          disabled
          fullWidth
          name='id'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Red Auto High'
          value={details.redAutoTopPieces}
          fullWidth
          name='redAutoTopPieces'
          type='number'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Red Auto Mid'
          value={details.redAutoMidPieces}
          fullWidth
          name='redAutoMidPieces'
          type='number'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Red Auto Low'
          value={details.redAutoMidPieces}
          fullWidth
          name='redAutoMidPieces'
          type='number'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Blue Auto High'
          value={details.blueAutoTopPieces}
          fullWidth
          name='blueAutoTopPieces'
          type='number'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Blue Auto Mid'
          value={details.blueAutoMidPieces}
          fullWidth
          name='blueAutoMidPieces'
          type='number'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Blue Auto Low'
          value={details.blueAutoMidPieces}
          fullWidth
          name='blueAutoMidPieces'
          type='number'
          onChange={handleUpdates}
        />
      </Grid>
    </Grid>
  );
};

const EmptyComponent: FC = () => <div>Empty Component</div>;

export const chargedUpComponents: SeasonComponents<ChargedUpDetails> = {
  MatchDetailInfo,
  RedScoreBreakdown: EmptyComponent,
  BlueScoreBreakdown: EmptyComponent,
  RefereeScoreSheet: ScoreSheet
};
