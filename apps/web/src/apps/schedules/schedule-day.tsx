import { Button, Divider, Grid, TextField, Typography } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { Day, EventSchedule, defaultBreak } from '@toa-lib/models';
import { DateTime } from 'luxon';
import { FC, useEffect, useState } from 'react';
import { ScheduleBreak } from './schedule-break';

interface Props {
  eventSchedule: EventSchedule;
  id: number;
  disabled?: boolean;
  onChange: (schedule: EventSchedule) => void;
}

export const ScheduleDay: FC<Props> = ({
  eventSchedule,
  id,
  disabled,
  onChange
}) => {
  const day = eventSchedule.days[id];
  const [startDate, setStartDate] = useState<DateTime | null>(
    DateTime.fromISO(day.startTime)
  );
  const [endDate, setEndDate] = useState<DateTime | null>(DateTime.now());

  useEffect(() => {
    const endDateTime = getEndDate(day);
    setEndDate(endDateTime);
  }, [day.breaks]);

  const changeMatches = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dayWithoutEndTime = {
      ...day,
      scheduledMatches: parseInt(event.target.value)
    };
    const endDateTime = getEndDate(dayWithoutEndTime);
    const newDay = {
      ...dayWithoutEndTime,
      endTime: endDateTime.toISO() ?? ''
    };
    setEndDate(endDateTime);
    updateScheduleDay(newDay);
  };

  const changeStartTime = (newValue: DateTime | null) => {
    const newTime = (newValue ? newValue : DateTime.now()).toISO();
    const dayWithoutEndTime = { ...day, startTime: newTime ?? '' };
    const endDateTime = getEndDate(dayWithoutEndTime);
    const newDay = {
      ...dayWithoutEndTime,
      endTime: endDateTime.toISO() ?? ''
    };
    setStartDate(newValue);
    setEndDate(endDateTime);
    updateScheduleDay(newDay);
  };

  const addBreak = () => {
    const newBreak = { ...defaultBreak, id: day.breaks.length };
    const newDay = {
      ...day,
      breaks: [...day.breaks, newBreak]
    };
    const newEndTime = getEndDate(newDay);
    updateScheduleDay({ ...newDay, endTime: newEndTime.toISO() ?? '' });
  };

  const removeBreak = () => {
    const newBreaks = day.breaks.slice(0, day.breaks.length - 1);
    const newDay = {
      ...day,
      breaks: newBreaks
    };
    const newEndTime = getEndDate(newDay);
    updateScheduleDay({ ...newDay, endTime: newEndTime.toISO() ?? '' });
  };

  const getEndDate = (newDay: Day): DateTime => {
    const matchesDuration =
      Math.ceil(newDay.scheduledMatches / eventSchedule.matchConcurrency) *
      eventSchedule.cycleTime;

    const breaksDuration =
      newDay.breaks.length > 0
        ? newDay.breaks
            .map((dayBreak) => dayBreak.duration)
            .reduce((prev, curr) => prev + curr)
        : 0;
    const newEndTime = DateTime.fromISO(newDay.startTime).plus({
      minutes: matchesDuration + breaksDuration
    });
    return newEndTime;
  };

  const updateScheduleDay = (day: Day) => {
    const newSchedule = {
      ...eventSchedule,
      days: eventSchedule.days.map((d) => (d.id === id ? day : d))
    };
    onChange(newSchedule);
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
            disabled={disabled}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <DateTimePicker
            label='Start Date'
            value={startDate}
            onChange={changeStartTime}
            slotProps={{ textField: { fullWidth: true } }}
            disabled={disabled}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={4}>
          <DateTimePicker
            format=''
            label='End Date'
            value={endDate}
            disabled
            slotProps={{ textField: { fullWidth: true } }}
          />
        </Grid>
      </Grid>
      {day.breaks.map((dayBreak) => (
        <ScheduleBreak
          key={`day-${id}-break-${dayBreak.id}`}
          eventSchedule={eventSchedule}
          dayId={id}
          breakId={dayBreak.id}
          onChange={onChange}
          disabled={disabled}
        />
      ))}
      <Grid container spacing={3}>
        <Grid item xs={12} md={2} lg={2}>
          <Button
            variant='contained'
            fullWidth
            onClick={addBreak}
            disabled={disabled}
          >
            Add Break
          </Button>
        </Grid>
        <Grid item xs={12} md={2} lg={2}>
          <Button
            variant='contained'
            fullWidth
            disabled={day.breaks.length <= 0 || disabled}
            onClick={removeBreak}
          >
            Remove Break
          </Button>
        </Grid>
      </Grid>
      <Divider
        sx={{
          marginTop: (theme) => theme.spacing(1),
          marginBottom: (theme) => theme.spacing(1)
        }}
      />
    </>
  );
};
