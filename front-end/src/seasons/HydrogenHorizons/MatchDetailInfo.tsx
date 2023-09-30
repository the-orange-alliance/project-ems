import { FC } from 'react';
import { MatchDetailInfoProps } from '..';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { HydrogenHorizons } from '@toa-lib/models';
import { useTeamIdentifiers } from 'src/hooks/use-team-identifier';

export const MatchDetailInfo: FC<
  MatchDetailInfoProps<HydrogenHorizons.MatchDetails>
> = ({ match, handleUpdates }) => {
  const identifiers = useTeamIdentifiers();
  if (!match || !match.details || !match.participants) return null;
  const redAlliance = match.participants.filter((p) => p.station < 20);
  const blueAlliance = match.participants.filter((p) => p.station >= 20);
  return (
    <Grid container spacing={3}>
      {/* RED ALLIANCE OXY/HYDRO/ALIGN */}
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Red Oxygen Points'
          value={match.details.redOxygenPoints}
          type='number'
          fullWidth
          name='redOxygenPoints'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Red Hydrogen Points'
          value={match.details.redHydrogenPoints}
          type='number'
          fullWidth
          name='redHydrogenPoints'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Red Alignment'
          value={match.details.redAlignment}
          type='number'
          fullWidth
          name='redAlignment'
          onChange={handleUpdates}
        />
      </Grid>
      {/* BLUE ALLIANCE OXY/HYDRO/ALIGN */}
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Blue Oxygen Points'
          value={match.details.blueOxygenPoints}
          type='number'
          fullWidth
          name='blueOxygenPoints'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Blue Hydrogen Points'
          value={match.details.blueHydrogenPoints}
          type='number'
          fullWidth
          name='blueHydrogenPoints'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label='Blue Alignment'
          value={match.details.blueAlignment}
          type='number'
          fullWidth
          name='blueAlignment'
          onChange={handleUpdates}
        />
      </Grid>
      {/* RED ALLIANCE PROFICIENCY */}
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[redAlliance[0].teamKey]} Proficiency`}
          value={match.details.redOneProficiency}
          type='number'
          fullWidth
          name='redOneProficiency'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[redAlliance[1].teamKey]} Proficiency`}
          value={match.details.redTwoProficiency}
          type='number'
          fullWidth
          name='redTwoProficiency'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[redAlliance[2].teamKey]} Proficiency`}
          value={match.details.redThreeProficiency}
          type='number'
          fullWidth
          name='redThreeProficiency'
          onChange={handleUpdates}
        />
      </Grid>
      {/* BLUE ALLIANCE PROFICIENCY */}
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[blueAlliance[0].teamKey]} Proficiency`}
          value={match.details.blueOneProficiency}
          type='number'
          fullWidth
          name='blueOneProficiency'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[blueAlliance[1].teamKey]} Proficiency`}
          value={match.details.blueTwoProficiency}
          type='number'
          fullWidth
          name='blueTwoProficiency'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[blueAlliance[2].teamKey]} Proficiency`}
          value={match.details.blueThreeProficiency}
          type='number'
          fullWidth
          name='blueThreeProficiency'
          onChange={handleUpdates}
        />
      </Grid>
    </Grid>
  );
};
