import { FC } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import { useRecoilState } from 'recoil';
import { currentScheduleByTournamentSelector } from 'src/stores/NewRecoil';
import { defaultDay } from '@toa-lib/models';
import Day from './Day';

const Days: FC = () => {
  const [schedule, setSchedule] = useRecoilState(
    currentScheduleByTournamentSelector
  );

  const addDay = () => {
    const newDay = { ...defaultDay, id: schedule.days.length };
    setSchedule((prev) => ({ ...prev, days: [...prev.days, newDay] }));
  };

  const removeDay = () => {
    setSchedule((prev) => ({
      ...prev,
      days: prev.days.slice(0, prev.days.length - 1)
    }));
  };

  return (
    <Box>
      {schedule.days.map((d) => {
        return (
          <Box key={`day-${d.id}`}>
            <Day id={d.id} />
            <Divider
              sx={{
                marginTop: (theme) => theme.spacing(1),
                marginBottom: (theme) => theme.spacing(1)
              }}
            />
          </Box>
        );
      })}
      <Grid
        container
        spacing={3}
        sx={{ paddingTop: (theme) => theme.spacing(1) }}
      >
        <Grid item xs={6} md={3} lg={2}>
          <Button variant='contained' onClick={addDay} fullWidth>
            Add Day
          </Button>
        </Grid>
        <Grid item xs={6} md={3} lg={2}>
          <Button
            variant='contained'
            disabled={schedule.days.length <= 0}
            onClick={removeDay}
            fullWidth
          >
            Remove Day
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Days;
