import { FC, ChangeEvent, useEffect } from 'react';
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import {
  allinaceMembers,
  eventKeySelector,
  selectedTournamentType,
  teamsInScheduleSelectorFamily,
  tournamentScheduleItemAtomFamily,
  tournamentScheduleSelector
} from 'src/stores/Recoil';
import Days from './Days';
import {
  generateFGCRoundRobinSchedule,
  generateFinalsSchedule,
  getTournamentLevelFromType
} from '@toa-lib/models';
import { Divider } from '@mui/material';
import ScheduleItemTable from './ScheduleItemTable';
import {
  deleteSchedule,
  postSchedule,
  setApiStorage
} from 'src/api/ApiProvider';
import { useFlags } from 'src/stores/AppFlags';

const SetupSchedulePlayoffs: FC = () => {
  const type = useRecoilValue(selectedTournamentType);
  const members = useRecoilValue(allinaceMembers).filter(
    (a) => a.tournamentLevel === getTournamentLevelFromType(type)
  );
  const [schedule, setSchedule] = useRecoilState(tournamentScheduleSelector);
  const [scheduleItems, setScheduleItems] = useRecoilState(
    tournamentScheduleItemAtomFamily(type)
  );
  console.log(schedule);
  const [flags, setFlag] = useFlags();

  useEffect(() => {
    setSchedule((prev) => ({
      ...prev,
      type,
      teamsParticipating: members.length
    }));
  }, []);

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
    const items =
      type === 'Round Robin'
        ? generateFGCRoundRobinSchedule(schedule, eventKey)
        : generateFinalsSchedule(schedule, eventKey);
    const teams = await snapshot.getPromise(
      teamsInScheduleSelectorFamily(type)
    );
    setScheduleItems(items);
    await deleteSchedule(type);
    await setFlag(
      'createdSchedules',
      flags.createdSchedules
        ? [...flags.createdSchedules, schedule.type]
        : [schedule.type]
    );
    const storedSchedule = { ...schedule, teams };
    await setApiStorage(`${schedule.type}.json`, storedSchedule);
    await postSchedule(items);
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
            label='Schedule'
            value={schedule.type}
            fullWidth
            disabled
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <TextField
            label='Teams Participating'
            value={schedule.teamsParticipating}
            fullWidth
            disabled
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
      </Grid>
      <Days />
      <Button
        variant='contained'
        onClick={generateSchedule}
        sx={{ marginTop: (theme) => theme.spacing(2) }}
      >
        Generate Schedule
      </Button>
      <Divider sx={{ marginBottom: (theme) => theme.spacing(2) }} />
      {scheduleItems.length > 0 && <ScheduleItemTable items={scheduleItems} />}
    </>
  );
};

export default SetupSchedulePlayoffs;
