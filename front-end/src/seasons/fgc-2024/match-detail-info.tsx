import { FC } from 'react';
import { MatchDetailInfoProps } from '..';
import { FeedingTheFuture } from '@toa-lib/models';
import { Grid, TextField } from '@mui/material';
import { useTeamIdentifiers } from 'src/hooks/use-team-identifier';
import NexusScoresheet from './nexus-sheets/nexus-scoresheet';
import { StateToggle } from 'src/components/inputs/state-toggle';
import {
  AllianceNexusGoalState,
  NexusGoalState
} from '@toa-lib/models/build/seasons/FeedingTheFuture';

export const MatchDetailInfo: FC<
  MatchDetailInfoProps<FeedingTheFuture.MatchDetails>
> = ({ match, handleUpdates }) => {
  const identifiers = useTeamIdentifiers();
  if (!match || !match.details || !match.participants) return null;
  const redAlliance = match.participants.filter((p) => p.station < 20);
  const blueAlliance = match.participants.filter((p) => p.station >= 20);

  const updateNexus = (
    alliance: 'red' | 'blue',
    goal: keyof AllianceNexusGoalState,
    state: NexusGoalState
  ) => {
    if (!match.details) return;
    handleUpdates({
      target: {
        name: `${alliance}NexusState`,
        value: { ...match.details[`${alliance}NexusState`], [goal]: state }
      }
    } as any);
  };

  return (
    <>
      {/* RED ALLIANCE */}
      <Grid
        container
        spacing={3}
        sx={{ border: '2px solid red', borderRadius: '1rem', mb: 4, p: 1 }}
      >
        <Grid item xs={12} sm={6} md={6}>
          <TextField
            label='Red Resevoir Conserved'
            value={match.details.redResevoirConserved}
            type='number'
            fullWidth
            name='redResevoirConserved'
            onChange={handleUpdates}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <TextField
            label='Red Food Produced'
            value={match.details.redFoodProduced}
            type='number'
            fullWidth
            name='redFoodProduced'
            onChange={handleUpdates}
          />
        </Grid>
        <Grid item xs={12} sm={12} md={12}>
          <NexusScoresheet
            side='both'
            state={match.details.redNexusState}
            opposingState={match.details.blueNexusState}
            alliance='red'
            onChange={(goal, state) => updateNexus('red', goal, state)}
            onOpposingChange={(goal, state) => updateNexus('blue', goal, state)}
          />
        </Grid>
        {/* RED ALLIANCE BALANCE STATUS */}
        <Grid item xs={12} sm={6} md={4}>
          <StateToggle
            title={<span>{identifiers[redAlliance[0].teamKey]} End Park</span>}
            states={['Flr', 'Rmp', 'Pltfm']}
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
            title={<span>{identifiers[redAlliance[1].teamKey]} End Park</span>}
            states={['Flr', 'Rmp', 'Pltfm']}
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
            title={<span>{identifiers[redAlliance[2].teamKey]} End Park</span>}
            states={['Flr', 'Rmp', 'Pltfm']}
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
        <Grid item xs={12} sm={6} md={6}>
          <TextField
            label='Blue Resevoir Conserved'
            value={match.details.blueResevoirConserved}
            type='number'
            fullWidth
            name='blueResevoirConserved'
            onChange={handleUpdates}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <TextField
            label='Blue Food Produced'
            value={match.details.blueFoodProduced}
            type='number'
            fullWidth
            name='blueFoodProduced'
            onChange={handleUpdates}
          />
        </Grid>
        <Grid item xs={12} sm={12} md={12}>
          <NexusScoresheet
            side='both'
            state={match.details.blueNexusState}
            opposingState={match.details.redNexusState}
            alliance='blue'
            onChange={(goal, state) => updateNexus('blue', goal, state)}
            onOpposingChange={(goal, state) => updateNexus('red', goal, state)}
          />
        </Grid>
        {/* BLUE ALLIANCE BALANCE STATUS */}
        <Grid item xs={12} sm={6} md={4}>
          <StateToggle
            title={<span>{identifiers[blueAlliance[0].teamKey]} End Park</span>}
            states={['Flr', 'Rmp', 'Pltfm']}
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
            title={<span>{identifiers[blueAlliance[1].teamKey]} End Park</span>}
            states={['Flr', 'Rmp', 'Pltfm']}
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
            title={<span>{identifiers[blueAlliance[2].teamKey]} End Park</span>}
            states={['Flr', 'Rmp', 'Pltfm']}
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
        <Grid item xs={6}>
          <StateToggle
            title={<span>Field Balanced</span>}
            states={['Flr', 'Rmp', 'Pltfm']}
            value={match.details.fieldBalanced ? 1 : 0}
            onChange={(v) =>
              handleUpdates({
                target: { name: 'fieldBalanced', value: v }
              } as any)
            }
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <TextField
            label='Food Secured'
            value={match.details.foodSecured}
            type='number'
            fullWidth
            name='foodSecured'
            onChange={handleUpdates}
          />
        </Grid>
      </Grid>
    </>
  );
};
