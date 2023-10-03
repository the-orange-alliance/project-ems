import { FC } from 'react';
import { HydrogenHorizons } from '@toa-lib/models';
import { ScoreBreakdownProps, SeasonComponents } from '..';
import { Grid, Typography } from '@mui/material';
import { isHydrogenHorizonsDetails } from '@toa-lib/models/build/seasons/HydrogenHorizons';
import RefereeScoreSheet from '@seasons/HydrogenHorizons/referee/ScoreSheet';
import { MatchDetailInfo } from './MatchDetailInfo';
import { RankingsReport } from './reports/RankingsReport';
import Settings from './Settings';

const RedScoreBreakdown: FC<
  ScoreBreakdownProps<HydrogenHorizons.MatchDetails>
> = ({ match }) => {
  const someDetails = match?.details;
  const details = isHydrogenHorizonsDetails(someDetails)
    ? someDetails
    : HydrogenHorizons.defaultMatchDetails;
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <Typography>{details.redOneProficiency}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{details.redHydrogenPoints}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{details.redTwoProficiency}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{details.redOxygenPoints}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{details.redThreeProficiency}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{details.redAlignment}</Typography>
      </Grid>
    </Grid>
  );
};

const BlueScoreBreakdown: FC<
  ScoreBreakdownProps<HydrogenHorizons.MatchDetails>
> = ({ match }) => {
  const someDetails = match?.details;
  const details = isHydrogenHorizonsDetails(someDetails)
    ? someDetails
    : HydrogenHorizons.defaultMatchDetails;
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <Typography>{details.blueOneProficiency}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{details.blueHydrogenPoints}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{details.blueTwoProficiency}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{details.blueOxygenPoints}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{details.blueThreeProficiency}</Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{details.blueAlignment}</Typography>
      </Grid>
    </Grid>
  );
};
export const hydrogenHorizonComponents: SeasonComponents<
  HydrogenHorizons.MatchDetails,
  HydrogenHorizons.SeasonRanking
> = {
  MatchDetailInfo,
  RedScoreBreakdown,
  BlueScoreBreakdown,
  RefereeScoreSheet,
  Settings,
  RankingsReport
};
