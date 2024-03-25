import { FC, useEffect } from 'react';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  currentTournamentSelector,
  currentScheduleByTournamentSelector,
  currentScheduleItemsByTournamentSelector
} from 'src/stores/NewRecoil';
import {
  calculateTotalMatches,
  getScheduleValidation,
  generateScheduleItems
} from '@toa-lib/models';
import Days from '../time/Days';
import ScheduleItemTable from '../ScheduleItemTable';
import { useFlags } from 'src/stores/AppFlags';
import { deleteSchedule, postSchedule } from 'src/api/use-schedule-data';
import { setApiStorage } from 'src/api/use-storage-data';
import { ScheduleOptions } from './ScheduleOptions';

const SetupSchedule: FC = () => {
  const tournament = useRecoilValue(currentTournamentSelector);
  const [schedule, setSchedule] = useRecoilState(
    currentScheduleByTournamentSelector
  );
  const [scheduleItems, setScheduleItems] = useRecoilState(
    currentScheduleItemsByTournamentSelector
  );

  const [flags, setFlag] = useFlags();
  const { valid, validationMessage } = getScheduleValidation(schedule);

  useEffect(() => {
    setSchedule((prev) => ({
      ...prev,
      totalMatches: calculateTotalMatches(prev)
    }));
  }, [
    schedule.matchesPerTeam,
    schedule.teamsPerAlliance,
    schedule.playoffsOptions
  ]);

  const generateSchedule = async () => {
    if (!tournament) return;
    const scheduleItems = generateScheduleItems(schedule);
    setScheduleItems(scheduleItems);
    await deleteSchedule(tournament.eventKey, tournament.tournamentKey);
    await setFlag('createdSchedules', [
      ...flags.createdSchedules,
      tournament.eventKey
    ]);
    await setApiStorage(
      `${schedule.eventKey}_${schedule.tournamentKey}.json`,
      schedule
    );
    await postSchedule(scheduleItems);
  };

  return (
    <>
      <ScheduleOptions />
      <Divider sx={{ marginBottom: (theme) => theme.spacing(2) }} />
      <Days />
      <Button
        variant='contained'
        onClick={generateSchedule}
        sx={{
          marginTop: (theme) => theme.spacing(2),
          marginBottom: (theme) => theme.spacing(2)
        }}
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
