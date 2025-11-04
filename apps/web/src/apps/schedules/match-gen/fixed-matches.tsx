import { Button, Row, Col } from 'antd';
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
  const [gen, setGen] = useState('fgc_2023');
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
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col xs={24} sm={12} md={20}>
        <MatchSchedulerDropdown onChange={setGen} value={gen} />
      </Col>
      <Col xs={24} sm={12} md={4} style={{ marginTop: 14 }}>
        <Button
          type='primary'
          onClick={createMatches}
          style={{ width: '100%' }}
        >
          Create Match Schedule
        </Button>
      </Col>
    </Row>
  );
};
