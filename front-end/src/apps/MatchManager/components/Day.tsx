import { FC, ChangeEvent } from 'react';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useRecoilState } from 'recoil';
import { tournamentScheduleDaySelector } from 'src/stores/Recoil';

interface Props {
  id: number;
}

const Day: FC<Props> = ({ id }) => {
  const [day, setDay] = useRecoilState(tournamentScheduleDaySelector(id));

  const changeMatches = (event: ChangeEvent<HTMLInputElement>) => {
    setDay((prev) => ({
      ...prev,
      scheduledMatches: parseInt(event.target.value)
    }));
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <Typography>Day {day.id}</Typography>
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <TextField
          label='Scheduled Matchs'
          value={day.scheduledMatches}
          onChange={changeMatches}
          type='number'
        />
      </Grid>
    </Grid>
  );
};

export default Day;
