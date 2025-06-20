import { Button } from 'antd';
import {
  ScheduleParams,
  ScheduleItem,
  Tournament,
  Match,
  createFixedMatches,
  assignMatchTimes,
  FGCMatches
} from '@toa-lib/models';
import { FC, useState } from 'react';
import { useAllianceMembers } from 'src/api/use-alliance-data.js';
import { MatchSchedulerDropdown } from 'src/components/dropdowns/match-scheduler-dropdown.js';

interface Props {
  eventSchedule?: ScheduleParams;
  scheduleItems?: ScheduleItem[];
  tournament?: Tournament;
  onCreateMatches: (matches: Match<any>[]) => void;
}

export const FixedMatches: FC<Props> = ({
  eventSchedule,
  scheduleItems,
  onCreateMatches
}) => {
  const { data: alliances } = useAllianceMembers(
    eventSchedule?.eventKey,
    eventSchedule?.tournamentKey
  );
  const [gen, setGen] = useState('standard');
  const createMatches = () => {
    if (!scheduleItems || !alliances) return;
    const map =
      gen === 'fgc_2023'
        ? FGCMatches.FGC2023.RoundRobinMap
        : FGCMatches.FGC2023.FinalsMap;
    const matches = createFixedMatches(scheduleItems, alliances, map);
    onCreateMatches(assignMatchTimes(matches, scheduleItems));
  };
  return (
    <div>
      <MatchSchedulerDropdown onChange={setGen} value={gen} />
      <Button
        style={{ marginTop: 16, display: 'block' }}
        type='primary'
        onClick={createMatches}
      >
        Create Match Schedule
      </Button>
    </div>
  );
};
