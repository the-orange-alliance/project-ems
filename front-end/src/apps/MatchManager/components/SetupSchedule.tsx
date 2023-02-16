import { ChangeEvent, FC, useEffect } from 'react';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  currentTournamentSelector,
  currentScheduleByTournamentSelector,
  currentScheduleItemsByTournamentSelector
} from 'src/stores/NewRecoil';
import {
  calculateTotalMatches,
  useScheduleValidator,
  generateScheduleItems
} from '@toa-lib/models';
import Days from './Days';
import ScheduleItemTable from './ScheduleItemTable';
import { useFlags } from 'src/stores/AppFlags';
import {
  deleteSchedule,
  postSchedule,
  setApiStorage
} from 'src/api/ApiProvider';

/**
 * TODO - This entire schedule file is for FIRST GLOBAL purposes only. Needs to be modified
 * for other purposes.
 */

const SetupSchedule: FC = () => {
  const tournament = useRecoilValue(currentTournamentSelector);
  const [schedule, setSchedule] = useRecoilState(
    currentScheduleByTournamentSelector
  );
  const [scheduleItems, setScheduleItems] = useRecoilState(
    currentScheduleItemsByTournamentSelector
  );

  const [flags, setFlag] = useFlags();
  const { valid, validationMessage } = useScheduleValidator(schedule);

  // useEffect(() => {
  //   setSchedule((prev) => ({
  //     ...prev,
  //     totalMatches: calculateTotalMatches(
  //       prev.teams.length,
  //       prev.matchesPerTeam,
  //       prev.teamsPerAlliance
  //     )
  //   }));
  // }, []);

  useEffect(() => {
    setSchedule((prev) => ({
      ...prev,
      totalMatches: calculateTotalMatches(
        prev.teamsParticipating,
        prev.matchesPerTeam,
        prev.teamsPerAlliance
      )
    }));
  }, [schedule.matchesPerTeam, schedule.teamsPerAlliance]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    const { name } = event.target;
    setSchedule((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const generateSchedule = async () => {
    if (!tournament) return;
    const scheduleItems = generateScheduleItems(schedule, tournament.eventKey);
    setScheduleItems(scheduleItems);
    await deleteSchedule(tournament.eventKey, tournament.tournamentKey);
    await setFlag('createdSchedules', [
      ...flags.createdSchedules,
      tournament.eventKey
    ]);
    const storedSchedule = Object.assign({}, { ...schedule });
    // await setApiStorage(`${schedule.type}.json`, storedSchedule);
    // await postSchedule(scheduleItems);
    console.log({ storedSchedule });
  };

  return (
    <>
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
      <Divider sx={{ marginBottom: (theme) => theme.spacing(2) }} />
      <Days />
      <Button
        variant='contained'
        onClick={generateSchedule}
        sx={{ marginTop: (theme) => theme.spacing(2) }}
        disabled={!valid}
      >
        Generate Schedule
      </Button>
      <Typography>{validationMessage}</Typography>
      <Divider sx={{ marginBottom: (theme) => theme.spacing(2) }} />
      {scheduleItems.length > 0 && <ScheduleItemTable items={scheduleItems} />}
    </>
  );
};

export default SetupSchedule;
