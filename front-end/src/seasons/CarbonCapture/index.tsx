import { FC } from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { MatchDetailInfoProps, SeasonComponents } from '..';
import { CarbonCaptureDetails } from '@toa-lib/models';
import ScoreSheet from '@seasons/CarbonCapture/referee/Scoresheet';

const MatchDetailInfo: FC<MatchDetailInfoProps<CarbonCaptureDetails>> = ({
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
          name='matchDetailKey'
        />
      </Grid>
      {/* TODO - Come up with dynamic way to change this. */}
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Carbon Points'
          value={details.carbonPoints}
          type='number'
          fullWidth
          name='carbonPoints'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Field Number'
          value={details.coopertitionBonusLevel}
          type='number'
          fullWidth
          name='coopertitionBonusLevel'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Red 1 Storage'
          value={details.redRobotOneStorage}
          type='number'
          fullWidth
          name='redRobotOneStorage'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Red 2 Storage'
          value={details.redRobotTwoStorage}
          type='number'
          fullWidth
          name='redRobotTwoStorage'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Red 3 Storage'
          value={details.redRobotThreeStorage}
          type='number'
          fullWidth
          name='redRobotThreeStorage'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Blue 1 Storage'
          value={details.blueRobotOneStorage}
          type='number'
          fullWidth
          name='blueRobotOneStorage'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Blue 2 Storage'
          value={details.blueRobotTwoStorage}
          type='number'
          fullWidth
          name='blueRobotTwoStorage'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Blue 3 Storage'
          value={details.blueRobotThreeStorage}
          type='number'
          fullWidth
          name='blueRobotThreeStorage'
          onChange={handleUpdates}
        />
      </Grid>
    </Grid>
  );
};

const EmptyComponent: FC = () => <div>Empty Component</div>;

export const carbonCaptureComponents: SeasonComponents<CarbonCaptureDetails> = {
  MatchDetailInfo,
  RedScoreBreakdown: EmptyComponent,
  BlueScoreBreakdown: EmptyComponent,
  RefereeScoreSheet: EmptyComponent
};
