import { Grid, TextField } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { EventSchedule, DayBreak } from '@toa-lib/models';
import { DateTime } from 'luxon';
import { FC, useState } from 'react';

interface Props {
  eventSchedule: EventSchedule;
  dayId: number;
  breakId: number;
  disabled?: boolean;
  onChange: (schedule: EventSchedule) => void;
}

export const ScheduleBreak: FC<Props> = ({
  dayId,
  breakId,
  eventSchedule,
  disabled,
  onChange
}) => {
  const day = eventSchedule.days[dayId];
  const dayBreak = day.breaks[breakId];
  const [startDate, setStartDate] = useState<DateTime | null>(DateTime.now());
  const [endDate, setEndDate] = useState<DateTime | null>(DateTime.now());

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = event.target;
    const newBreak = {
      ...dayBreak,
      [name]: type === 'number' ? parseInt(value) : value
    };
    const newStartTime = DateTime.fromISO(day.startTime).plus({
      minutes:
        Math.ceil(newBreak.afterMatch / eventSchedule.matchConcurrency) *
        eventSchedule.cycleTime
    });
    const newEndTime = newStartTime.plus({
      minutes: newBreak.duration
    });
    newBreak.startTime = newStartTime.toISO() ?? '';
    newBreak.endTime = newEndTime.toISO() ?? '';
    const endDateTime = getEndDate(newBreak);
    setStartDate(newStartTime);
    setEndDate(newEndTime);
    updateScheduleDayBreak(newBreak, endDateTime);
  };

  const getEndDate = (dayBreak: DayBreak): DateTime => {
    // First make the end date time by adding the duration to the start time
    const endDateTime = DateTime.fromISO(eventSchedule.days[dayId].endTime);
    // Second create a new breaks array with the updated break
    const newBreaks = eventSchedule.days[dayId].breaks.map((b) =>
      b.id === breakId ? dayBreak : b
    );
    // Third calculate the new breaks duration by subtracting the old breaks duration from the new breaks duration
    const oldBreaksDuration =
      day.breaks.length > 0
        ? day.breaks
            .map((dayBreak) => dayBreak.duration)
            .reduce((prev, curr) => prev + curr)
        : 0;
    const breaksDuration =
      newBreaks.length > 0
        ? newBreaks
            .map((dayBreak) => dayBreak.duration)
            .reduce((prev, curr) => prev + curr)
        : 0;
    return endDateTime.plus({ minutes: breaksDuration - oldBreaksDuration });
  };

  const updateScheduleDayBreak = (dayBreak: DayBreak, newEndTime: DateTime) => {
    const dayBreaks = eventSchedule.days[dayId].breaks;
    const newSchedule = {
      ...eventSchedule,
      days: eventSchedule.days.map((d) =>
        d.id === dayId
          ? {
              ...d,
              endTime: newEndTime.toISO() ?? '',
              breaks: dayBreaks.map((b) => (b.id === breakId ? dayBreak : b))
            }
          : d
      )
    };
    onChange(newSchedule);
  };

  return (
    <Grid
      key={`day=${day.id}-break-${dayBreak.id}`}
      container
      spacing={3}
      sx={{
        paddingTop: (theme) => theme.spacing(1),
        paddingBottom: (theme) => theme.spacing(2)
      }}
    >
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <TextField
          name='name'
          label='Break Name'
          value={dayBreak.name}
          fullWidth
          onChange={handleChange}
          disabled={disabled}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={1}>
        <TextField
          name='afterMatch'
          label='Match'
          value={dayBreak.afterMatch}
          fullWidth
          onChange={handleChange}
          type='number'
          disabled={disabled}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={1}>
        <TextField
          name='duration'
          label='Duration'
          value={dayBreak.duration}
          fullWidth
          onChange={handleChange}
          type='number'
          disabled={disabled}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={4}>
        <DateTimePicker
          label='Start Date'
          value={startDate}
          disabled
          slotProps={{ textField: { fullWidth: true } }}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={4}>
        <DateTimePicker
          label='End Date'
          value={endDate}
          disabled
          slotProps={{ textField: { fullWidth: true } }}
        />
      </Grid>
    </Grid>
  );
};
