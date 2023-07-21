import { Grid, TextField } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { DateTime } from 'luxon';
import { ChangeEvent, FC, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  currentScheduleByTournamentSelector,
  currentScheduleDaySelectorFam
} from 'src/stores/NewRecoil';

interface Props {
  dayId: number;
  dayBreakId: number;
}

const Break: FC<Props> = ({ dayId, dayBreakId }) => {
  const schedule = useRecoilValue(currentScheduleByTournamentSelector);
  const [day, setDay] = useRecoilState(currentScheduleDaySelectorFam(dayId));
  const dayBreak = day.breaks[dayBreakId];

  const [startDate, setStartDate] = useState<DateTime | null>(DateTime.now());
  const [endDate, setEndDate] = useState<DateTime | null>(DateTime.now());

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = event.target;
    const newBreak = {
      ...dayBreak,
      [name]: type === 'number' ? parseInt(value) : value
    };
    const newStartTime = DateTime.fromISO(day.startTime).plus({
      minutes:
        Math.ceil(newBreak.afterMatch / schedule.matchConcurrency) *
        schedule.cycleTime
    });
    newBreak.startTime = newStartTime.toISO() ?? '';
    newBreak.endTime =
      newStartTime.plus({ minutes: newBreak.duration }).toISO() ?? '';
    handleStartChange(newStartTime);
    handleEndChange(newStartTime.plus({ minutes: newBreak.duration }));
    const newBreaks = [
      ...day.breaks.slice(0, newBreak.id),
      newBreak,
      ...day.breaks.slice(newBreak.id + 1)
    ];
    const breaksDuration =
      day.breaks.length > 0
        ? day.breaks
            .map((dayBreak) => dayBreak.duration)
            .reduce((prev, curr) => prev + curr)
        : 0;
    setDay({
      ...day,
      breaks: newBreaks,
      endTime:
        DateTime.fromISO(day.endTime)
          .plus({ minutes: breaksDuration })
          .toISO() ?? ''
    });
  };

  const handleStartChange = (newValue: DateTime | null) => {
    const newTime = (newValue ? newValue : DateTime.now()).toISO() ?? '';
    setStartDate(newValue);
    setDay({ ...day, startTime: newTime });
  };

  const handleEndChange = (newValue: DateTime | null) => {
    const newTime = (newValue ? newValue : DateTime.now()).toISO() ?? '';
    setEndDate(newValue);
    setDay({ ...day, endTime: newTime });
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
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={4}>
        <DateTimePicker
          label='Start Date'
          format='fff'
          value={startDate}
          onChange={handleStartChange}
          disabled
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={4}>
        <DateTimePicker
          label='End Date'
          format='fff'
          value={endDate}
          onChange={handleEndChange}
          disabled
        />
      </Grid>
    </Grid>
  );
};

export default Break;
