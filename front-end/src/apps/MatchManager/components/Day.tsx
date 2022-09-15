import { FC, ChangeEvent, useState } from 'react';
import moment, { Moment } from 'moment';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  tournamentScheduleDaySelector,
  tournamentScheduleSelector
} from 'src/stores/Recoil';
import { DATE_FORMAT_MIN_SHORT, defaultBreak } from '@toa-lib/models';
import DayBreak from './DayBreak';

interface Props {
  id: number;
}

const Day: FC<Props> = ({ id }) => {
  const schedule = useRecoilValue(tournamentScheduleSelector);
  const [day, setDay] = useRecoilState(tournamentScheduleDaySelector(id));

  const [startDate, setStartDate] = useState<Moment | null>(moment());
  const [endDate, setEndDate] = useState<Moment | null>(moment());

  const changeMatches = (event: ChangeEvent<HTMLInputElement>) => {
    setDay((prev) => ({
      ...prev,
      scheduledMatches: parseInt(event.target.value)
    }));
    updateEndTime();
  };

  const handleStartChange = (newValue: Moment | null) => {
    setStartDate(newValue);
    setDay((prev) => ({ ...prev, startTime: newValue ? newValue : moment() }));
    updateEndTime();
  };

  const handleEndChange = (newValue: Moment | null) => {
    setEndDate(newValue);
    setDay((prev) => ({ ...prev, endTime: newValue ? newValue : moment() }));
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

  const updateEndTime = () => {
    const matchesDuration =
      Math.ceil(day.scheduledMatches / schedule.matchConcurrency) *
      schedule.cycleTime;

    const breaksDuration =
      day.breaks.length > 0
        ? day.breaks
            .map((dayBreak) => dayBreak.duration)
            .reduce((prev, curr) => prev + curr)
        : 0;
    console.log(matchesDuration);
    setDay((prev) => ({
      ...prev,
      endTime: moment(day.startTime).add(
        matchesDuration + breaksDuration,
        'minutes'
      )
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
            inputFormat={DATE_FORMAT_MIN_SHORT}
            value={startDate}
            onChange={handleStartChange}
            disableMaskedInput
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
            renderInput={(params) => <TextField {...params} fullWidth />}
            disabled
          />
        </Grid>
      </Grid>
      {day.breaks.map((dayBreak) => {
        return (
          <DayBreak
            key={`day-${day.id}-break-${dayBreak.id}`}
            day={day}
            dayBreak={dayBreak}
            setDay={setDay}
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

export default Day;
