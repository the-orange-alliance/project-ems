import { Box, Button, Grid } from '@mui/material';
import { EventSchedule, defaultDay } from '@toa-lib/models';
import { DateTime } from 'luxon';
import { FC } from 'react';
import { ScheduleDay } from './schedule-day';

interface Props {
  eventSchedule?: EventSchedule;
  disabled?: boolean;
  onChange: (schedule: EventSchedule) => void;
}

export const ScheduleLayout: FC<Props> = ({
  eventSchedule,
  disabled,
  onChange
}) => {
  const addDay = () => {
    if (!eventSchedule) return;
    const startTime =
      eventSchedule.days.length > 0
        ? DateTime.fromISO(
            eventSchedule.days[eventSchedule.days.length - 1].startTime
          )
            .plus({ days: 1 })
            .toISO() ?? defaultDay.startTime
        : defaultDay.startTime;
    const newDay = { ...defaultDay, id: eventSchedule.days.length, startTime };
    onChange({
      ...eventSchedule,
      days: [...eventSchedule.days, newDay]
    });
  };
  const removeDay = () => {
    if (!eventSchedule) return;
    onChange({
      ...eventSchedule,
      days: eventSchedule.days.slice(0, eventSchedule.days.length - 1)
    });
  };
  return (
    <Box>
      {eventSchedule?.days.map((d) => (
        <ScheduleDay
          key={`day-${d.id}`}
          eventSchedule={eventSchedule}
          id={d.id}
          onChange={onChange}
          disabled={disabled}
        />
      ))}
      <Grid
        container
        spacing={3}
        sx={{ paddingTop: (theme) => theme.spacing(1) }}
      >
        <Grid item xs={6} md={3} lg={2}>
          <Button
            variant='contained'
            fullWidth
            disabled={disabled}
            onClick={addDay}
          >
            Add Day
          </Button>
        </Grid>
        <Grid item xs={6} md={3} lg={2}>
          <Button
            variant='contained'
            fullWidth
            disabled={disabled || !eventSchedule?.days.length}
            onClick={removeDay}
          >
            Remove Day
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};
