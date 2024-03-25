import { Box, Tab, Tabs } from '@mui/material';
import { EventSchedule } from '@toa-lib/models';
import { FC, SyntheticEvent, useEffect, useState } from 'react';
import TabPanel from 'src/components/util/TabPanel/TabPanel';
import { ScheduleParticipants } from './schedule-participants';
import { ScheduleParams } from './schedule-params';

interface Props {
  tournamentKey: string | null;
  eventSchedule?: EventSchedule;
  hasMatches?: boolean;
}

export const ScheduleTabs: FC<Props> = ({
  tournamentKey,
  eventSchedule,
  hasMatches
}) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    setValue(0);
  }, [tournamentKey]);

  const handleChange = (_: SyntheticEvent, newValue: number) =>
    setValue(newValue);

  return (
    <Box sx={{ width: '100%' }}>
      <Box>
        <Tabs value={value} onChange={handleChange}>
          <Tab label='Schedule Participants' />
          <Tab label='Schedule Parameters' />
        </Tabs>
        <TabPanel value={value} index={0}>
          <ScheduleParticipants
            eventSchedule={eventSchedule}
            disabled={hasMatches}
          />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <ScheduleParams eventSchedule={eventSchedule} disabled={hasMatches} />
        </TabPanel>
      </Box>
    </Box>
  );
};
