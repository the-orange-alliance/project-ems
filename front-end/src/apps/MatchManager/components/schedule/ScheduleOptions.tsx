import { ChangeEvent, FC, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  allianceMembersByTournamentSelector,
  currentScheduleByTournamentSelector,
  currentTournamentSelector
} from 'src/stores/NewRecoil';
import {
  FINALS_LEVEL,
  RANKING_LEVEL,
  ROUND_ROBIN_LEVEL
} from '@toa-lib/models';
import SeriesTypeDropdown from 'src/components/Dropdowns/SeriesTypeDropdown';

export const ScheduleOptions: FC = () => {
  const schedule = useRecoilValue(currentTournamentSelector);

  if (!schedule) return null;

  switch (schedule.tournamentLevel) {
    case RANKING_LEVEL:
      return <DefaultScheduleOptions />;
    case ROUND_ROBIN_LEVEL:
      return <RoundRobinScheduleOptions />;
    case FINALS_LEVEL:
      return <FinalsScheduleOptions />;
    default:
      return <DefaultScheduleOptions />;
  }
};

export const DefaultScheduleOptions: FC = () => {
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
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <TextField
          name='matchConcurrency'
          label='Match Concurrency'
          value={schedule.matchConcurrency}
          fullWidth
          onChange={handleChange}
          type='number'
        />
      </Grid>
    </Grid>
  );
};

export const RoundRobinScheduleOptions: FC = () => {
  const [schedule, setSchedule] = useRecoilState(
    currentScheduleByTournamentSelector
  );
  const allianceMembers = useRecoilValue(allianceMembersByTournamentSelector);
  const allianceCaptains = allianceMembers.filter((a) => a.isCaptain);

  useEffect(() => {
    if (allianceCaptains.length > 0) {
      setSchedule((prev) => ({
        ...prev,
        teamsParticipating: allianceMembers.length,
        playoffsOptions: {
          ...prev.playoffsOptions,
          allianceCount: allianceCaptains.length
        }
      }));
    }
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    const { name } = event.target;
    setSchedule((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlayoffsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    const { name } = event.target;
    setSchedule((prev) => ({
      ...prev,
      playoffsOptions: {
        ...prev.playoffsOptions,
        [name]: value
      }
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
          label='Alliances Scheduled'
          value={allianceCaptains.length}
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
          name='rounds'
          label='Rounds'
          value={schedule.playoffsOptions?.rounds ?? 1}
          fullWidth
          onChange={handlePlayoffsChange}
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

export const FinalsScheduleOptions: FC = () => {
  const [schedule, setSchedule] = useRecoilState(
    currentScheduleByTournamentSelector
  );
  const allianceCaptains = useRecoilValue(
    allianceMembersByTournamentSelector
  ).filter((a) => a.isCaptain);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    const { name } = event.target;
    setSchedule((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSeriesChange = (value: number) => {
    setSchedule((prev) => ({
      ...prev,
      scheduleOptions: {
        seriesType: value
      }
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
          label='Alliances Scheduled'
          value={allianceCaptains.length}
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
        <SeriesTypeDropdown
          value={schedule.playoffsOptions?.seriesType ?? 3}
          onChange={handleSeriesChange}
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
