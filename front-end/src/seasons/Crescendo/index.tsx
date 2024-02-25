import { FC } from 'react';
import { Crescendo } from '@toa-lib/models';
import {
  MatchDetailInfoProps,
  ScoreBreakdownProps,
  SeasonComponents
} from '..';
import { Grid, TextField, Typography } from '@mui/material';
import { RankingsReport } from './reports/RankingsReport';
import ScoreSheet from '@seasons/Crescendo/referee/ScoreSheet';

const MatchDetailInfo: FC<MatchDetailInfoProps<Crescendo.MatchDetails>> = ({
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
          label='Red Auto Amp'
          value={details.redAutoAmpNotes}
          fullWidth
          name='redAutoAmpNotes'
          type='number'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Red Auto Speaker'
          value={details.redAutoSpeakerNotes}
          fullWidth
          name='redAutoSpeakerNotes'
          type='number'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Blue Amp'
          value={details.blueAutoAmpNotes}
          fullWidth
          name='blueAutoAmpNotes'
          type='number'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Blue Auto Speaker'
          value={details.blueAutoSpeakerNotes}
          fullWidth
          name='blueAutoSpeakerNotes'
          type='number'
          onChange={handleUpdates}
        />
      </Grid>
    </Grid>
  );
};

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
  RefereeScoreSheet: ScoreSheet,
  RankingsReport
};
