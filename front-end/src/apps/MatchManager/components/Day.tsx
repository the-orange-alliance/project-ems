import { FC, ChangeEvent, useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useRecoilState, useRecoilValue } from 'recoil';
import { tournamentScheduleDaySelector } from 'src/stores/Recoil';
import { Day, defaultBreak } from '@toa-lib/models';
import DayBreak from './DayBreak';
import { currentScheduleByTournamentSelector } from 'src/stores/NewRecoil';

interface Props {
  id: number;
}

const DayComponent: FC<Props> = ({ id }) => {
  const schedule = useRecoilValue(currentScheduleByTournamentSelector);
  const [day, setDay] = useRecoilState(tournamentScheduleDaySelector(id));

  const [startDate, setStartDate] = useState<DateTime | null>(DateTime.now());
  const [endDate, setEndDate] = useState<DateTime | null>(DateTime.now());

  useEffect(() => {
    handleEndChange(DateTime.fromISO(day.endTime));
  }, [day.breaks]);

  const changeMatches = (event: ChangeEvent<HTMLInputElement>) => {
    const newDay = { ...day, scheduledMatches: parseInt(event.target.value) };
    setDay(newDay);
    updateEndTime(newDay);
  };

  const handleStartChange = (newValue: DateTime | null) => {
    const newTime = (newValue ? newValue : DateTime.now()).toISO();
    const newDay = { ...day, startTime: newTime };
    setStartDate(newValue);
    setDay(newDay);
    updateEndTime(newDay);
  };

  const handleEndChange = (newValue: DateTime | null) => {
    const newTime = (newValue ? newValue : DateTime.now()).toISO();
    setEndDate(newValue);
    setDay((prev) => ({ ...prev, endTime: newTime }));
  };

  const addBreak = () => {
    const newBreak = { ...defaultBreak, id: day.breaks.length };
    setDay((prev) => ({ ...prev, breaks: [...prev.breaks, newBreak] }));
  };

  const removeBreak = () => {
    setDay((prev) => ({
      ...prev,
      breaks: prev.breaks.slice(0, prev.breaks.length - 1)
    }));
  };

  const updateEndTime = (newDay: Day) => {
    const matchesDuration =
      Math.ceil(newDay.scheduledMatches / schedule.matchConcurrency) *
      schedule.cycleTime;

    const breaksDuration =
      newDay.breaks.length > 0
        ? newDay.breaks
            .map((dayBreak) => dayBreak.duration)
            .reduce((prev, curr) => prev + curr)
        : 0;
    const newEndTime = DateTime.fromISO(newDay.startTime).plus({
      minutes: matchesDuration + breaksDuration
    });
    setEndDate(newEndTime);
    setDay((prev) => ({
      ...prev,
      endTime: newEndTime.toISO()
    }));
  };

  return (
    <>
      <Grid
        container
        spacing={3}
        sx={{
          paddingTop: (theme) => theme.spacing(1),
          paddingBottom: (theme) => theme.spacing(1)
        }}
      >
        <Grid
          item
          xs={12}
          sm={3}
          md={3}
          lg={2}
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <Typography>Day {day.id}</Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={2}>
          <TextField
            label='Scheduled Matches'
            value={day.scheduledMatches}
            onChange={changeMatches}
            type='number'
            fullWidth
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <DateTimePicker
            label='Start Date'
            inputFormat='fff'
            value={startDate}
            onChange={handleStartChange}
            disableMaskedInput
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <DateTimePicker
            label='End Date'
            inputFormat='fff'
            value={endDate}
            onChange={handleEndChange}
            disableMaskedInput
            renderInput={(params) => <TextField {...params} fullWidth />}
            disabled
          />
        </Grid>
      </Grid>
      {day.breaks.map((dayBreak) => {
        return (
          <DayBreak
            key={`day-${day.id}-break-${dayBreak.id}`}
            dayId={day.id}
            dayBreakId={dayBreak.id}
          />
        );
      })}
      <Grid container spacing={3}>
        <Grid item xs={12} md={2} lg={2}>
          <Button variant='contained' fullWidth onClick={addBreak}>
            Add Break
          </Button>
        </Grid>
        <Grid item xs={12} md={2} lg={2}>
          <Button
            variant='contained'
            fullWidth
            disabled={day.breaks.length <= 0}
            onClick={removeBreak}
          >
            Remove Break
          </Button>
        </Grid>
      </Grid>
    </>
  );
};

export default DayComponent;
