import { FC } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { useRecoilState } from 'recoil';
import { tournamentScheduleSelector } from 'src/stores/Recoil';
import { defaultDay } from '@toa-lib/models';
import Day from './Day';

const Days: FC = () => {
  const [schedule, setSchedule] = useRecoilState(tournamentScheduleSelector);

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
          </Box>
        );
      })}
      <Box sx={{ display: 'flex', gap: '8px' }}>
        <Button variant='contained' onClick={addDay}>
          Add Day
        </Button>
        <Button
          variant='contained'
          disabled={schedule.days.length <= 0}
          onClick={removeDay}
        >
          Remove Day
        </Button>
      </Box>
    </Box>
  );
};

export default Days;
