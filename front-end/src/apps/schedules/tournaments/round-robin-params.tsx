import { Grid, TextField } from '@mui/material';
import { calculateTotalMatches, EventSchedule } from '@toa-lib/models';
import { ChangeEvent, FC, useEffect } from 'react';

interface Props {
  eventSchedule?: EventSchedule;
  disabled?: boolean;
  onChange: (schedule: EventSchedule) => void;
}

export const RoudnRobinScheduleOptions: FC<Props> = ({
  eventSchedule,
  disabled,
  onChange
}) => {
  useEffect(() => {
    if (!eventSchedule) return;
    onChange({
      ...eventSchedule,
      totalMatches: calculateTotalMatches(eventSchedule)
    });
  }, [
    eventSchedule?.matchesPerTeam,
    eventSchedule?.teamsPerAlliance,
    eventSchedule?.playoffsOptions
  ]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!eventSchedule) return;
    const value = parseInt(event.target.value);
    const { name } = event.target;
    onChange({
      ...eventSchedule,
      [name]: value
    });
  };

  const handleRoundsChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!eventSchedule) return;
    const value = parseInt(event.target.value);
    onChange({
      ...eventSchedule,
      playoffsOptions: {
        ...eventSchedule.playoffsOptions,
        rounds: value
      }
    });
  };

  return (
    <Grid
      container
      spacing={3}
      sx={{ marginBottom: (theme) => theme.spacing(2) }}
    >
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <TextField
          name='matchConcurrency'
          label='Match Concurrency'
          value={eventSchedule?.matchConcurrency}
          disabled={disabled}
          fullWidth
          onChange={handleChange}
          type='number'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <TextField
          name='cycleTime'
          label='Cycle Time'
          value={eventSchedule?.cycleTime}
          disabled={disabled}
          fullWidth
          onChange={handleChange}
          type='number'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <TextField
          name='rounds'
          label='Rounds'
          value={eventSchedule?.playoffsOptions?.rounds}
          disabled={disabled}
          fullWidth
          onChange={handleRoundsChange}
          type='number'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <TextField
          label='Teams Scheduled'
          value={eventSchedule?.teamsParticipating}
          disabled
          fullWidth
          type='number'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <TextField
          label='Alliances Scheduled'
          value={eventSchedule?.playoffsOptions?.allianceCount}
          disabled
          fullWidth
          type='number'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <TextField
          label='Total Matches'
          value={eventSchedule?.totalMatches}
          disabled
          fullWidth
          type='number'
        />
      </Grid>
    </Grid>
  );
};
