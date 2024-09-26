import { FeedingTheFuture } from '@toa-lib/models';
import { FC } from 'react';
import { ScoreBreakdownProps } from '..';
import { Grid, TextField } from '@mui/material';
import { useTeamIdentifiers } from 'src/hooks/use-team-identifier';
import NexusScoresheet from './nexus-sheets/nexus-scoresheet';
import { StateToggle } from 'src/components/inputs/state-toggle';

export const RedScoreBreakdown: FC<
  ScoreBreakdownProps<FeedingTheFuture.MatchDetails>
> = ({ match }) => {
  const identifiers = useTeamIdentifiers();
  const redAlliance = match?.participants?.filter((p) => p.station < 20) ?? [];
  return (
    <Grid container spacing={3}>
      {/* RED ALLIANCE */}
      <Grid item xs={12} sm={4} md={4}>
        <TextField
          label='Red Resevoir Conserved'
          value={match?.details?.redResevoirConserved ?? 0}
          type='number'
          fullWidth
          disabled
        />
      </Grid>
      <Grid item xs={12} sm={4} md={4}>
        <TextField
          label='Red Food Produced'
          value={match?.details?.redFoodProduced ?? 0}
          type='number'
          fullWidth
          disabled
        />
      </Grid>
      <Grid item xs={12} sm={4} md={4}>
        <TextField
          label='Food Secured'
          value={match?.details?.foodSecured ?? 0}
          type='number'
          fullWidth
          disabled
        />
      </Grid>
      {/* Red Alliance Stepped Nexus */}
      <Grid item xs={12} sm={12} md={12}>
        <NexusScoresheet
          state={match?.details?.redNexusState}
          opposingState={match?.details?.blueNexusState}
          disabled
          alliance='red'
          side='both'
        />
      </Grid>

      {/* RED ALLIANCE BALANCE STATUS */}
      <Grid item xs={12} sm={6} md={4}>
        <StateToggle
          title={<span>{identifiers[redAlliance[0].teamKey]} Balanced</span>}
          states={['Flr', 'Rmp', 'Pltfm']}
          value={match?.details?.redRobotOneParked ?? 0}
          disabled
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StateToggle
          title={<span>{identifiers[redAlliance[1].teamKey]} Balanced</span>}
          states={['Flr', 'Rmp', 'Pltfm']}
          value={match?.details?.redRobotTwoParked ?? 0}
          disabled
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StateToggle
          title={<span>{identifiers[redAlliance[2].teamKey]} Balanced</span>}
          states={['Flr', 'Rmp', 'Pltfm']}
          value={match?.details?.redRobotThreeParked ?? 0}
          disabled
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6}>
        <TextField
          label='Red Score'
          value={match?.redScore ?? 0}
          type='number'
          fullWidth
          disabled
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6}>
        <TextField
          label='Red Penalties'
          value={match?.redMinPen ?? 0}
          type='number'
          fullWidth
          disabled
        />
      </Grid>
    </Grid>
  );
};

export const BlueScoreBreakdown: FC<
  ScoreBreakdownProps<FeedingTheFuture.MatchDetails>
> = ({ match }) => {
  const identifiers = useTeamIdentifiers();
  const blueAlliance =
    match?.participants?.filter((p) => p.station >= 20) ?? [];
  return (
    <Grid container spacing={3}>
      {/* BLUE ALLIANCE */}
      <Grid item xs={12} sm={4} md={4}>
        <TextField
          label='Blue Resevoir Conserved'
          value={match?.details?.blueResevoirConserved ?? 0}
          type='number'
          fullWidth
          disabled
        />
      </Grid>
      <Grid item xs={12} sm={4} md={4}>
        <TextField
          label='Blue Food Produced'
          value={match?.details?.blueFoodProduced ?? 0}
          type='number'
          fullWidth
          disabled
        />
      </Grid>
      <Grid item xs={12} sm={4} md={4}>
        <TextField
          label='Food Secured'
          value={match?.details?.foodSecured ?? 0}
          type='number'
          fullWidth
          disabled
        />
      </Grid>

      {/* Blue Alliance Stepped Nexus */}
      <Grid item xs={12} sm={12} md={12}>
        <NexusScoresheet
          state={match?.details?.blueNexusState}
          opposingState={match?.details?.redNexusState}
          disabled
          alliance='blue'
          side='both'
        />
      </Grid>

      {/* BLUE ALLIANCE BALANCE STATUS */}
      <Grid item xs={12} sm={6} md={4}>
        <StateToggle
          title={<span>{identifiers[blueAlliance[0].teamKey]} Balanced</span>}
          states={['Flr', 'Rmp', 'Pltfm']}
          value={match?.details?.blueRobotOneParked ?? 0}
          disabled
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StateToggle
          title={<span>{identifiers[blueAlliance[1].teamKey]} Balanced</span>}
          states={['Flr', 'Rmp', 'Pltfm']}
          value={match?.details?.blueRobotTwoParked ?? 0}
          disabled
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4}>
        <StateToggle
          title={<span>{identifiers[blueAlliance[2].teamKey]} Balanced</span>}
          states={['Flr', 'Rmp', 'Pltfm']}
          value={match?.details?.blueRobotThreeParked ?? 0}
          disabled
          fullWidth
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6}>
        <TextField
          label='Blue Score'
          value={match?.blueScore ?? 0}
          type='number'
          fullWidth
          disabled
        />
      </Grid>
      <Grid item xs={12} sm={6} md={6}>
        <TextField
          label='Blue Penalties'
          value={match?.blueMinPen ?? 0}
          type='number'
          fullWidth
          disabled
        />
      </Grid>
    </Grid>
  );
};
