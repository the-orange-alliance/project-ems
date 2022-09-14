import { FC, ChangeEvent, useState } from 'react';
import moment, { Moment } from 'moment';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { useRecoilState } from 'recoil';
import { tournamentScheduleDaySelector } from 'src/stores/Recoil';

interface Props {
  id: number;
}

const Day: FC<Props> = ({ id }) => {
  const [day, setDay] = useRecoilState(tournamentScheduleDaySelector(id));

  const [startDate, setStartDate] = useState<Moment | null>(moment());
  const [endDate, setEndDate] = useState<Moment | null>(moment());

  const changeMatches = (event: ChangeEvent<HTMLInputElement>) => {
    setDay((prev) => ({
      ...prev,
      scheduledMatches: parseInt(event.target.value)
    }));
  };

  const handleStartChange = (newValue: Moment | null) => {
    setStartDate(newValue);
    setDay((prev) => ({ ...prev, startTime: newValue ? newValue : moment() }));
  };

  const handleEndChange = (newValue: Moment | null) => {
    setEndDate(newValue);
    setDay((prev) => ({ ...prev, endTime: newValue ? newValue : moment() }));
  };

  return (
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
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <DesktopDatePicker
          label='Start Date'
          inputFormat='MM/DD/YYYY'
          value={startDate}
          onChange={handleStartChange}
          renderInput={(params) => <TextField {...params} fullWidth />}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={2}>
        <DesktopDatePicker
          label='End Date'
          inputFormat='MM/DD/YYYY'
          value={endDate}
          onChange={handleEndChange}
          renderInput={(params) => <TextField {...params} fullWidth />}
        />
      </Grid>
      <Grid item xs={12}>
        <Button variant='contained'>Add Break</Button>
      </Grid>
    </Grid>
  );
};

export default Day;
