import { Grid, TextField } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { DATE_FORMAT_MIN_SHORT, Day, DayBreak } from '@toa-lib/models';
import moment, { Moment } from 'moment';
import { ChangeEvent, FC, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  tournamentScheduleDaySelector,
  tournamentScheduleSelector
} from 'src/stores/Recoil';

interface Props {
  dayId: number;
  dayBreakId: number;
}

const Break: FC<Props> = ({ dayId, dayBreakId }) => {
  const schedule = useRecoilValue(tournamentScheduleSelector);
  const [day, setDay] = useRecoilState(tournamentScheduleDaySelector(dayId));
  const dayBreak = day.breaks[dayBreakId];

  const [startDate, setStartDate] = useState<Moment | null>(moment());
  const [endDate, setEndDate] = useState<Moment | null>(moment());

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = event.target;
    const newBreak = {
      ...dayBreak,
      [name]: type === 'number' ? parseInt(value) : value
    };
    const newStartTime = moment(day.startTime).add(
      Math.ceil(newBreak.afterMatch / schedule.matchConcurrency) *
        schedule.cycleTime,
      'minutes'
    );
    handleStartChange(newStartTime);
    handleEndChange(moment(newStartTime).add(newBreak.duration));
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
      endTime: moment(day.endTime).add(breaksDuration, 'minutes').toISOString()
    });
  };

  const handleStartChange = (newValue: Moment | null) => {
    const newTime = (newValue ? newValue : moment()).toISOString();
    setStartDate(newValue);
    setDay({ ...day, startTime: newTime });
  };

  const handleEndChange = (newValue: Moment | null) => {
    const newTime = (newValue ? newValue : moment()).toISOString();
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
          inputFormat={DATE_FORMAT_MIN_SHORT}
          value={startDate}
          onChange={handleStartChange}
          disableMaskedInput
          disabled
          renderInput={(params) => <TextField {...params} fullWidth />}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={4}>
        <DateTimePicker
          label='End Date'
          inputFormat={DATE_FORMAT_MIN_SHORT}
          value={endDate}
          onChange={handleEndChange}
          disableMaskedInput
          disabled
          renderInput={(params) => <TextField {...params} fullWidth />}
        />
      </Grid>
    </Grid>
  );
};

export default Break;
