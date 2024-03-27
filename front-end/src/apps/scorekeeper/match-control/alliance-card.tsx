import { Grid, Paper, Typography } from '@mui/material';
import { Alliance, BLUE_STATION, MatchParticipant } from '@toa-lib/models';
import { FC } from 'react';

interface Props {
  alliance: Alliance;
  participants?: MatchParticipant[];
}

export const AllianceCard: FC<Props> = ({ alliance, participants }) => {
  const allianceParticipants = participants
    ? participants.filter((p) =>
        alliance === 'red'
          ? p.station < BLUE_STATION
          : p.station >= BLUE_STATION
      )
    : [];
  return (
    <Paper
      className={alliance === 'red' ? 'red-bg-imp' : 'blue-bg-imp'}
      sx={{ paddingBottom: (theme) => theme.spacing(1) }}
    >
      <Grid container spacing={3}>
        <Grid item md={4} sx={{ paddingTop: '4px !important' }}>
          <Typography variant='body1' align='center'>
            Team
          </Typography>
        </Grid>
        <Grid item md={4} sx={{ paddingTop: '4px !important' }}>
          <Typography variant='body1' align='center'>
            Card Status
          </Typography>
        </Grid>
        <Grid item md={2} sx={{ paddingTop: '4px !important' }}>
          <Typography variant='body1' align='center'>
            No Show
          </Typography>
        </Grid>
        <Grid item md={2} sx={{ paddingTop: '4px !important' }}>
          <Typography variant='body1' align='center'>
            DQ
          </Typography>
        </Grid>
      </Grid>
      {allianceParticipants.map((p) => (
        <Grid key={`${p.teamKey}-${p.station}`} container spacing={3}>
          <Grid item md={8}>
            {/* <TeamStatusRow key={p.teamKey} station={p.station} /> */}
          </Grid>
          <Grid item md={2}>
            {/* <NoShowStatus key={`no-show-${p.teamKey}`} station={p.station} /> */}
          </Grid>
          <Grid item md={2}>
            {/* <DisqualifiedStatus key={`dq-${p.teamKey}`} station={p.station} /> */}
          </Grid>
        </Grid>
      ))}
    </Paper>
  );
};
