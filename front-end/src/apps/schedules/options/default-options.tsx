import { Grid, TextField } from '@mui/material';
import { EventSchedule } from '@toa-lib/models';
import { ChangeEvent, FC } from 'react';

interface Props {
  eventSchedule: EventSchedule;
  onChange: (schedule: EventSchedule) => void;
}

export const DefaultScheduleOptions: FC<Props> = ({
  eventSchedule,
  onChange
}) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    const { name } = event.target;
    onChange({
      ...eventSchedule,
      [name]: value
    });
  };

  return (
    <Grid
      container
      spacing={3}
      sx={{ marginBottom: (theme) => theme.spacing(2) }}
    >
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <TextField
          label='Teams Scheduled'
          value={eventSchedule.teams.length}
          disabled
          fullWidth
          type='number'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <TextField
          name='cycleTime'
          label='Cycle Time'
          value={eventSchedule.cycleTime}
          fullWidth
          onChange={handleChange}
          type='number'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <TextField
          name='matchesPerTeam'
          label='Matches Per Team'
          value={eventSchedule.matchesPerTeam}
          fullWidth
          onChange={handleChange}
          type='number'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <TextField
          label='Total Matches'
          value={eventSchedule.totalMatches}
          disabled
          fullWidth
          type='number'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <TextField
          name='matchConcurrency'
          label='Match Concurrency'
          value={eventSchedule.matchConcurrency}
          fullWidth
          onChange={handleChange}
          type='number'
        />
      </Grid>
    </Grid>
  );
};
