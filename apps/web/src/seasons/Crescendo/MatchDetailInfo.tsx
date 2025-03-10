import { FC } from 'react';
import { MatchDetailInfoProps } from '..';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { Crescendo } from '@toa-lib/models';
import { useTeamIdentifiers } from 'src/hooks/use-team-identifier';

export const MatchDetailInfo: FC<
  MatchDetailInfoProps<Crescendo.MatchDetails>
> = ({ match, handleUpdates }) => {
  const identifiers = useTeamIdentifiers();
  if (!match || !match.details || !match.participants) return null;
  const redAlliance = match.participants.filter((p) => p.station < 20);
  const blueAlliance = match.participants.filter((p) => p.station >= 20);
  console.log({ identifiers, redAlliance, blueAlliance });
  return (
    <Grid container spacing={3}>
      {/* RED ALLIANCE AUTONOMOUS */}
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[redAlliance[0].teamKey]} Auto Leave`}
          value={match.details.redAutoMobilityOne}
          type='number'
          fullWidth
          name='redAutoMobilityOne'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[redAlliance[1].teamKey]} Auto Leave`}
          value={match.details.redAutoMobilityTwo}
          type='number'
          fullWidth
          name='redAutoMobilityTwo'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[redAlliance[2].teamKey]} Auto Leave`}
          value={match.details.redAutoMobilityThree}
          type='number'
          fullWidth
          name='redAutoMobilityThree'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Red Auto Amp Notes'
          value={match.details.redAutoAmpNotes}
          type='number'
          fullWidth
          name='redAutoAmpNotes'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Red Auto Speaker Notes'
          value={match.details.redAutoSpeakerNotes}
          type='number'
          fullWidth
          name='redAutoSpeakerNotes'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} />
      {/* BLUE ALLIANCE AUTONOMOUS */}
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[blueAlliance[0].teamKey]} Auto Leave`}
          value={match.details.redAutoMobilityOne}
          type='number'
          fullWidth
          name='redAutoMobilityOne'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[blueAlliance[1].teamKey]} Auto Leave`}
          value={match.details.blueAutoMobilityTwo}
          type='number'
          fullWidth
          name='blueAutoMobilityTwo'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[blueAlliance[2].teamKey]} Auto Leave`}
          value={match.details.blueAutoMobilityThree}
          type='number'
          fullWidth
          name='blueAutoMobilityThree'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Blue Auto Amp Notes'
          value={match.details.blueAutoAmpNotes}
          type='number'
          fullWidth
          name='blueAutoAmpNotes'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Blue Auto Speaker Notes'
          value={match.details.blueAutoSpeakerNotes}
          type='number'
          fullWidth
          name='blueAutoSpeakerNotes'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} />
    </Grid>
  );
};
