import { FC } from 'react';
import { MatchDetailInfoProps } from '..';
import { FeedingTheFuture } from '@toa-lib/models';
import { Grid, TextField } from '@mui/material';
import { useTeamIdentifiers } from 'src/hooks/use-team-identifier';
import NexusScoresheet from './nexus-sheets/nexus-scoresheet';
import { StateToggle } from 'src/components/inputs/state-toggle';

export const MatchDetailInfo: FC<
  MatchDetailInfoProps<FeedingTheFuture.MatchDetails>
> = ({ match, handleUpdates }) => {
  const identifiers = useTeamIdentifiers();
  if (!match || !match.details || !match.participants) return null;
  const redAlliance = match.participants.filter((p) => p.station < 20);
  const blueAlliance = match.participants.filter((p) => p.station >= 20);
  return (
    <>
      {/* RED ALLIANCE */}
      <Grid
        container
        spacing={3}
        sx={{ border: '2px solid red', borderRadius: '1rem', mb: 4, p: 1 }}
      >
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label='Red Resevoir Conserved'
            value={match.details.redResevoirConserved}
            type='number'
            fullWidth
            name='redResevoirConserved'
            onChange={handleUpdates}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label='Red Food Produced'
            value={match.details.redFoodProduced}
            type='number'
            fullWidth
            name='redFoodProduced'
            onChange={handleUpdates}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label='Red Food Secured'
            value={match.details.redFoodSecured}
            type='number'
            fullWidth
            name='redFoodSecured'
            onChange={handleUpdates}
          />
        </Grid>
        <Grid item xs={12} sm={12} md={12}>
          <NexusScoresheet
            state={match.details.redNexusState}
            alliance='red'
            onChange={(s) =>
              handleUpdates({
                target: { name: 'redNexusState', value: s }
              } as any)
            }
          />
        </Grid>
        {/* RED ALLIANCE BALANCE STATUS */}
        <Grid item xs={12} sm={6} md={4}>
          <StateToggle
            title={<span>{identifiers[redAlliance[0].teamKey]} Balanced</span>}
            states={['N', 'Y']}
            value={match.details.redRobotOneParked}
            onChange={(v) =>
              handleUpdates({
                target: { name: 'redRobotOneParked', value: v }
              } as any)
            }
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StateToggle
            title={<span>{identifiers[redAlliance[1].teamKey]} Balanced</span>}
            states={['N', 'Y']}
            value={match.details.redRobotTwoParked}
            onChange={(v) =>
              handleUpdates({
                target: { name: 'redRobotTwoParked', value: v }
              } as any)
            }
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StateToggle
            title={<span>{identifiers[redAlliance[2].teamKey]} Balanced</span>}
            states={['N', 'Y']}
            value={match.details.redRobotThreeParked}
            onChange={(v) =>
              handleUpdates({
                target: { name: 'redRobotThreeParked', value: v }
              } as any)
            }
            fullWidth
          />
        </Grid>
      </Grid>

      {/* BLUE ALLIANCE */}
      <Grid
        container
        spacing={3}
        sx={{ border: '2px solid blue', borderRadius: '1rem', mb: 4, p: 1 }}
      >
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label='Blue Resevoir Conserved'
            value={match.details.blueResevoirConserved}
            type='number'
            fullWidth
            name='blueResevoirConserved'
            onChange={handleUpdates}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label='Blue Food Produced'
            value={match.details.blueFoodProduced}
            type='number'
            fullWidth
            name='blueFoodProduced'
            onChange={handleUpdates}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            label='Blue Food Secured'
            value={match.details.blueFoodSecured}
            type='number'
            fullWidth
            name='blueFoodSecured'
            onChange={handleUpdates}
          />
        </Grid>
        <Grid item xs={12} sm={12} md={12}>
          <NexusScoresheet
            state={match.details.blueNexusState}
            alliance='blue'
            onChange={(s) =>
              handleUpdates({
                target: { name: 'blueNexusState', value: s }
              } as any)
            }
          />
        </Grid>
        {/* BLUE ALLIANCE BALANCE STATUS */}
        <Grid item xs={12} sm={6} md={4}>
          <StateToggle
            title={<span>{identifiers[blueAlliance[0].teamKey]} Balanced</span>}
            states={['N', 'Y']}
            value={match.details.blueRobotOneParked}
            onChange={(v) =>
              handleUpdates({
                target: { name: 'blueRobotOneParked', value: v }
              } as any)
            }
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StateToggle
            title={<span>{identifiers[blueAlliance[1].teamKey]} Balanced</span>}
            states={['N', 'Y']}
            value={match.details.blueRobotTwoParked}
            onChange={(v) =>
              handleUpdates({
                target: { name: 'blueRobotTwoParked', value: v }
              } as any)
            }
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StateToggle
            title={<span>{identifiers[blueAlliance[2].teamKey]} Balanced</span>}
            states={['N', 'Y']}
            value={match.details.blueRobotThreeParked}
            onChange={(v) =>
              handleUpdates({
                target: { name: 'blueRobotThreeParked', value: v }
              } as any)
            }
            fullWidth
          />
        </Grid>
      </Grid>

      {/* Alliance agnostic scores */}
      <Grid
        container
        spacing={3}
        sx={{ border: '2px solid purple', borderRadius: '1rem', mb: 1, p: 1 }}
      >
        {/* COOPERTITION */}
        <Grid item xs={12}>
          <StateToggle
            title={<span>Field Balanced</span>}
            states={['N', 'Y']}
            value={match.details.fieldBalanced}
            onChange={(v) =>
              handleUpdates({
                target: { name: 'fieldBalanced', value: v }
              } as any)
            }
            fullWidth
          />
        </Grid>
      </Grid>
    </>
  );
};
