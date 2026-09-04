import { Button, Row, Col, Alert } from 'antd';
import {
  ScheduleParams,
  ScheduleItem,
  Tournament,
  Match,
  createFixedMatches,
  assignMatchTimes,
  getPlayoffStructure,
  getDefaultPlayoffStructureKey,
  resolvePlayoffStructureKey
} from '@toa-lib/models';
import { FC, useEffect, useState } from 'react';
import { useAllianceMembers } from 'src/api/use-alliance-data.js';
import { MatchSchedulerDropdown } from 'src/components/dropdowns/match-scheduler-dropdown.js';

interface Props {
  eventSchedule?: ScheduleParams;
  scheduleItems?: ScheduleItem[];
  tournament?: Tournament;
  onCreateMatches: (matches: Match<any>[]) => void;
}

const FALLBACK_STRUCTURE_KEY = 'fgc-round-robin-8';

const defaultStructureKey = (eventSchedule?: ScheduleParams): string =>
  (eventSchedule?.type
    ? getDefaultPlayoffStructureKey(eventSchedule.type)
    : undefined) ?? FALLBACK_STRUCTURE_KEY;

export const FixedMatches: FC<Props> = ({
  eventSchedule,
  scheduleItems,
  onCreateMatches
}) => {
  const { data: alliances } = useAllianceMembers(
    eventSchedule?.eventKey,
    eventSchedule?.tournamentKey
  );
  const [gen, setGen] = useState<string>(() =>
    defaultStructureKey(eventSchedule)
  );

  // Re-default the structure when the selected tournament changes.
  const tournamentKey = eventSchedule?.tournamentKey;
  useEffect(() => {
    setGen(defaultStructureKey(eventSchedule));
  }, [tournamentKey]);

  const hasAlliances = !!alliances && alliances.length > 0;

  const createMatches = () => {
    const structure = getPlayoffStructure(gen);
    if (!scheduleItems || !hasAlliances || !structure) return;
    const matches = createFixedMatches(
      scheduleItems,
      alliances,
      structure.matchMap
    );
    onCreateMatches(assignMatchTimes(matches, scheduleItems));
  };

  return (
    <>
      {!hasAlliances && (
        <Alert
          style={{ marginBottom: 16 }}
          type='warning'
          showIcon
          message='No alliances saved for this tournament'
          description='Go to Schedule Participants, use "Auto Assign" (or build the alliances manually), then Save Alliances before generating matches.'
        />
      )}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={20}>
          <MatchSchedulerDropdown
            onChange={setGen}
            value={resolvePlayoffStructureKey(gen)}
            tournamentType={eventSchedule?.type}
          />
        </Col>
        <Col xs={24} sm={12} md={4} style={{ marginTop: 14 }}>
          <Button
            type='primary'
            onClick={createMatches}
            disabled={!hasAlliances || !scheduleItems}
            style={{ width: '100%' }}
          >
            Create Match Schedule
          </Button>
        </Col>
      </Row>
    </>
  );
};
