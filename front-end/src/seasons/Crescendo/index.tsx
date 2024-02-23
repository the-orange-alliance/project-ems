import { FC } from 'react';
import { Crescendo } from '@toa-lib/models';
import { ScoreBreakdownProps, SeasonComponents } from '..';
import { Grid, Typography } from '@mui/material';
import { RankingsReport } from './reports/RankingsReport';
import { MatchDetailInfo } from './MatchDetailInfo';
import { ScoreSheet as RefereeScoreSheet } from './referee/RefereeSheet';

const RedScoreBreakdown: FC<ScoreBreakdownProps<Crescendo.MatchDetails>> = ({
  match
}) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <Typography>SCORE: </Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{match?.redScore}</Typography>
      </Grid>
    </Grid>
  );
};

const BlueScoreBreakdown: FC<ScoreBreakdownProps<Crescendo.MatchDetails>> = ({
  match
}) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6}>
        <Typography>SCORE: </Typography>
      </Grid>
      <Grid item xs={12} sm={6}>
        <Typography>{match?.blueScore}</Typography>
      </Grid>
    </Grid>
  );
};
export const crescendoComponents: SeasonComponents<
  Crescendo.MatchDetails,
  Crescendo.SeasonRanking
> = {
  MatchDetailInfo,
  RedScoreBreakdown,
  BlueScoreBreakdown,
  RefereeScoreSheet,
  RankingsReport
};
