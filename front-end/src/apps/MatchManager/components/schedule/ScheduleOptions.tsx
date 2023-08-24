import { ChangeEvent, FC } from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { useRecoilState } from 'recoil';
import { currentScheduleByTournamentSelector } from 'src/stores/NewRecoil';

export const ScheduleOptions: FC = () => {
  const [schedule, setSchedule] = useRecoilState(
    currentScheduleByTournamentSelector
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    const { name } = event.target;
    setSchedule((prev) => ({
      ...prev,
      [name]: value
    }));
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
          value={schedule.teams.length}
          disabled
          fullWidth
          type='number'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <TextField
          name='cycleTime'
          label='Cycle Time'
          value={schedule.cycleTime}
          fullWidth
          onChange={handleChange}
          type='number'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <TextField
          name='matchesPerTeam'
          label='Matches Per Team'
          value={schedule.matchesPerTeam}
          fullWidth
          onChange={handleChange}
          type='number'
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <TextField
          label='Total Matches'
          value={schedule.totalMatches}
          disabled
          fullWidth
          type='number'
        />
      </Grid>
    </Grid>
  );
};
