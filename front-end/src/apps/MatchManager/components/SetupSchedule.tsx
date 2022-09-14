import { ChangeEvent, FC, useEffect } from 'react';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil';
import {
  eventKeySelector,
  selectedTournamentType,
  teamsInCurrentSchedule,
  tournamentScheduleSelector
} from 'src/stores/Recoil';
import {
  calculateTotalMatches,
  useScheduleValidator,
  generateScheduleWithPremiereField
} from '@toa-lib/models';
import Days from './Days';

/**
 * TODO - This entire schedule file is for FIRST GLOBAL purposes only. Needs to be modified
 * for other purposes.
 */

const SetupSchedule: FC = () => {
  const tournamentType = useRecoilValue(selectedTournamentType);
  const scheduledTeams = useRecoilValue(teamsInCurrentSchedule);

  const [schedule, setSchedule] = useRecoilState(tournamentScheduleSelector);

  const { valid, validationMessage } = useScheduleValidator(schedule);

  useEffect(() => {
    setSchedule((prev) => ({
      ...prev,
      matchConcurrency: 5,
      hasPremiereField: true,
      type: tournamentType,
      teamsParticipating: scheduledTeams.length,
      totalMatches: calculateTotalMatches(
        scheduledTeams.length,
        prev.matchesPerTeam,
        prev.teamsPerAlliance
      )
    }));
  }, []);

  useEffect(() => {
    setSchedule((prev) => ({
      ...prev,
      teamsParticipating: scheduledTeams.length
    }));
  }, [scheduledTeams]);

  useEffect(() => {
    setSchedule((prev) => ({ ...prev, type: tournamentType }));
  }, [tournamentType]);

  useEffect(() => {
    setSchedule((prev) => ({
      ...prev,
      totalMatches: calculateTotalMatches(
        prev.teamsParticipating,
        prev.matchesPerTeam,
        prev.teamsPerAlliance
      )
    }));
  }, [schedule.teamsPerAlliance, schedule.matchesPerTeam]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    const { name } = event.target;
    setSchedule((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const generateSchedule = useRecoilCallback(({ snapshot }) => async () => {
    const eventKey = await snapshot.getPromise(eventKeySelector);
    console.log(generateScheduleWithPremiereField(schedule, eventKey));
  });

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
            value={scheduledTeams.length}
            disabled
            fullWidth
            type='number'
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <TextField
            name='teamsPerAlliance'
            label='Teams Per Alliance'
            value={schedule.teamsPerAlliance}
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
    </>
  );
};

export default SetupSchedule;
