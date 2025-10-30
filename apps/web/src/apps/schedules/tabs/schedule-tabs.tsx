import { Tabs, Divider } from 'antd';
import { ScheduleParams, Match } from '@toa-lib/models';
import { FC, useEffect, useState } from 'react';
import { TabPanel } from 'src/components/util/tab-panel.js';
import { ScheduleParticipants } from './schedule-participants.js';
import { ScheduleParams as EventScheduleParams } from './schedule-params.js';
import { ScheduleMatches } from './schedule-matches.js';
import { MatchEditor } from './match-editor.js';

interface Props {
  tournamentKey: string | null;
  eventSchedule?: ScheduleParams;
  onEventScheduleChange?: (schedule: ScheduleParams) => void;
  savedMatches?: Match<any>[];
  hasMatches?: boolean;
}

export const ScheduleTabs: FC<Props> = ({
  tournamentKey,
  eventSchedule,
  savedMatches,
  hasMatches,
  onEventScheduleChange
}) => {
  const [value, setValue] = useState('0');
  useEffect(() => {
    setValue('0');
  }, [tournamentKey]);

  const items = [
    {
      key: '0',
      label: 'Schedule Participants',
      disabled: !eventSchedule,
      children: (
        <TabPanel value={parseInt(value)} index={0}>
          <ScheduleParticipants
            eventSchedule={eventSchedule}
            onEventScheduleChange={onEventScheduleChange}
            disabled={hasMatches}
          />
        </TabPanel>
      )
    },
    {
      key: '1',
      label: 'Schedule Parameters',
      disabled: !eventSchedule,
      children: (
        <TabPanel value={parseInt(value)} index={1}>
          <EventScheduleParams
            eventSchedule={eventSchedule}
            onEventScheduleChange={onEventScheduleChange}
            disabled={false}
          />
        </TabPanel>
      )
    },
    {
      key: '2',
      label: 'Schedule Matches',
      disabled: !eventSchedule,
      children: (
        <TabPanel value={parseInt(value)} index={2}>
          <ScheduleMatches
            eventSchedule={eventSchedule}
            onEventScheduleChange={onEventScheduleChange}
            savedMatches={savedMatches}
            disabled={false}
          />
        </TabPanel>
      )
    },
    {
      key: '3',
      label: 'Match Editor',
      disabled: !eventSchedule,
      children: (
        <TabPanel value={parseInt(value)} index={3}>
          <MatchEditor
            eventSchedule={eventSchedule}
            onEventScheduleChange={onEventScheduleChange}
            savedMatches={savedMatches}
          />
        </TabPanel>
      )
    }
  ];

  return (
    <div style={{ width: '100%' }}>
      <Tabs activeKey={value} onChange={setValue} items={items} type='line' />
      <Divider />
    </div>
  );
};
