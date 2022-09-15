import { Grid, TextField } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers';
import { DATE_FORMAT_MIN_SHORT, Day, DayBreak } from '@toa-lib/models';
import moment, { Moment } from 'moment';
import { ChangeEvent, FC, useState } from 'react';

interface Props {
  day: Day;
  dayBreak: DayBreak;
  setDay: (newDay: Day) => void;
}

const Break: FC<Props> = ({ day, dayBreak, setDay }) => {
  const [startDate, setStartDate] = useState<Moment | null>(moment());
  const [endDate, setEndDate] = useState<Moment | null>(moment());

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const newBreak = { ...dayBreak, [name]: value };
    setDay({
      ...day,
      breaks: [
        ...day.breaks.slice(0, newBreak.id),
        newBreak,
        ...day.breaks.slice(newBreak.id + 1)
      ]
    });
  };

  const handleStartChange = (newValue: Moment | null) => {
    setStartDate(newValue);
    setDay({ ...day, startTime: newValue ? newValue : moment() });
  };

  const handleEndChange = (newValue: Moment | null) => {
    setEndDate(newValue);
    setDay({ ...day, endTime: newValue ? newValue : moment() });
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
