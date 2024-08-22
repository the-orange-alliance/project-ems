import {
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField
} from '@mui/material';
import { EventSchedule, calculateTotalMatches } from '@toa-lib/models';
import { ChangeEvent, FC, useEffect } from 'react';

interface Props {
  eventSchedule?: EventSchedule;
  disabled?: boolean;
  onChange: (schedule: EventSchedule) => void;
}

export const DefaultScheduleOptions: FC<Props> = ({
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

  const handleSelectChange = (event: SelectChangeEvent<boolean | number>) => {
    if (!eventSchedule) return;
    const { name, value } = event.target;
    onChange({
      ...eventSchedule,
      [name]: Boolean(value)
    });
  };

  return (
    <Grid
      container
      spacing={3}
      sx={{ marginBottom: (theme) => theme.spacing(2) }}
    >
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <FormControl fullWidth>
          <InputLabel>Premiere Field</InputLabel>
          <Select
            name='hasPremiereField'
            label='Premiere Field?'
            value={eventSchedule?.hasPremiereField ? 1 : 0}
            disabled={disabled}
            fullWidth
            onChange={handleSelectChange}
            type='number'
          >
            <MenuItem value={0}>No</MenuItem>
            <MenuItem value={1}>Yes</MenuItem>
          </Select>
        </FormControl>
      </Grid>
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
          name='matchesPerTeam'
          label='Matches Per Team'
          value={eventSchedule?.matchesPerTeam}
          disabled={disabled}
          fullWidth
          onChange={handleChange}
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
