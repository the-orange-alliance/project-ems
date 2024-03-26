import { Box, Divider, Tab, Tabs } from '@mui/material';
import { EventSchedule, Match } from '@toa-lib/models';
import { FC, SyntheticEvent, useEffect, useState } from 'react';
import TabPanel from 'src/components/util/TabPanel/TabPanel';
import { ScheduleParticipants } from './schedule-participants';
import { ScheduleParams } from './schedule-params';
import { ScheduleMatches } from './schedule-matches';
import { MatchEditor } from './match-editor';

interface Props {
  tournamentKey: string | null;
  eventSchedule?: EventSchedule;
  savedMatches?: Match<any>[];
  hasMatches?: boolean;
}

export const ScheduleTabs: FC<Props> = ({
  tournamentKey,
  eventSchedule,
  savedMatches,
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
          <Tab label='Schedule Matches' />
          <Tab label='Match Editor' />
        </Tabs>
        <Divider />
        <TabPanel value={value} index={0}>
          <ScheduleParticipants
            eventSchedule={eventSchedule}
            disabled={hasMatches}
          />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <ScheduleParams eventSchedule={eventSchedule} disabled={hasMatches} />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <ScheduleMatches
            eventSchedule={eventSchedule}
            savedMatches={savedMatches}
            disabled={hasMatches}
          />
        </TabPanel>
        <TabPanel value={value} index={3}>
          <MatchEditor
            eventSchedule={eventSchedule}
            savedMatches={savedMatches}
          />
        </TabPanel>
      </Box>
    </Box>
  );
};
