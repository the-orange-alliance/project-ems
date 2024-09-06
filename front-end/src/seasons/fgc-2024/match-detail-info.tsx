import { FC } from 'react';
import { MatchDetailInfoProps } from '..';
import { FeedingTheFuture } from '@toa-lib/models';
import { Grid, TextField } from '@mui/material';
import { useTeamIdentifiers } from 'src/hooks/use-team-identifier';

export const MatchDetailInfo: FC<
  MatchDetailInfoProps<FeedingTheFuture.MatchDetails>
> = ({ match, handleUpdates }) => {
  const identifiers = useTeamIdentifiers();
  if (!match || !match.details || !match.participants) return null;
  const redAlliance = match.participants.filter((p) => p.station < 20);
  const blueAlliance = match.participants.filter((p) => p.station >= 20);
  return (
    <Grid container spacing={3}>
      {/* RED ALLIANCE */}
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Red Resevoir Conserved'
          value={match.details.redResevoirConserved}
          type='number'
          fullWidth
          name='redResevoirConserved'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Red Nexus Conserved'
          value={match.details.redNexusConserved}
          type='number'
          fullWidth
          name='redNexusConserved'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Red Food Produced'
          value={match.details.redFoodProduced}
          type='number'
          fullWidth
          name='redFoodProduced'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Red Food Secured'
          value={match.details.redFoodSecured}
          type='number'
          fullWidth
          name='redFoodSecured'
          onChange={handleUpdates}
        />
      </Grid>
      {/* BLUE ALLIANCE */}
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Blue Resevoir Conserved'
          value={match.details.blueResevoirConserved}
          type='number'
          fullWidth
          name='blueResevoirConserved'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Blue Nexus Conserved'
          value={match.details.blueNexusConserved}
          type='number'
          fullWidth
          name='blueNexusConserved'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Blue Food Produced'
          value={match.details.blueFoodProduced}
          type='number'
          fullWidth
          name='blueFoodProduced'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <TextField
          label='Blue Food Secured'
          value={match.details.blueFoodSecured}
          type='number'
          fullWidth
          name='blueFoodSecured'
          onChange={handleUpdates}
        />
      </Grid>
      {/* RED ALLIANCE BALANCE STATUS */}
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[redAlliance[0].teamKey]} Balance Status`}
          value={match.details.redRobotOneBalanced}
          type='number'
          fullWidth
          name='redRobotOneBalanced'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[redAlliance[1].teamKey]} Balance Status`}
          value={match.details.redRobotTwoBalanced}
          type='number'
          fullWidth
          name='redRobotTwoBalanced'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[redAlliance[2].teamKey]} Balance Status`}
          value={match.details.redRobotThreeBalanced}
          type='number'
          fullWidth
          name='redRobotThreeBalanced'
          onChange={handleUpdates}
        />
      </Grid>
      {/* BLUE ALLIANCE BALANCE STATUS */}
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[blueAlliance[0].teamKey]} Balance Status`}
          value={match.details.blueRobotOneBalanced}
          type='number'
          fullWidth
          name='blueRobotOneBalanced'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[blueAlliance[1].teamKey]} Balance Status`}
          value={match.details.blueRobotTwoBalanced}
          type='number'
          fullWidth
          name='blueRobotTwoBalanced'
          onChange={handleUpdates}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <TextField
          label={`${identifiers[blueAlliance[2].teamKey]} Balance Status`}
          value={match.details.blueRobotThreeBalanced}
          type='number'
          fullWidth
          name='blueRobotThreeBalanced'
          onChange={handleUpdates}
        />
      </Grid>
      {/* COOPERTITION */}
      <Grid item xs={12} sm={12} md={12}>
        <TextField
          label='Coopertition'
          value={match.details.coopertition}
          type='number'
          fullWidth
          name='coopertition'
          onChange={handleUpdates}
        />
      </Grid>
    </Grid>
  );
};
