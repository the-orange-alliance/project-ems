import { Button, Col, Row } from 'antd';
import {
  ScheduleParams,
  Match,
  ScheduleItem,
  Tournament,
  assignMatchTimes
} from '@toa-lib/models';
import { FGCSchedule } from '@toa-lib/models';
import { FC, useState } from 'react';
import { createMatchSchedule } from 'src/api/use-match-data.js';
import { MatchMakerQualityDropdown } from 'src/components/dropdowns/match-maker-dropdown.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';

interface Props {
  eventSchedule?: ScheduleParams;
  scheduleItems?: ScheduleItem[];
  tournament?: Tournament;
  onCreateMatches: (matches: Match<any>[]) => void;
}

export const RandomMatches: FC<Props> = ({
  eventSchedule,
  scheduleItems,
  tournament,
  onCreateMatches
}) => {
  const [quality, setQuality] = useState('best');
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();
  const createMatches = async () => {
    setLoading(true);
    try {
      if (!eventSchedule) return;
      if (!tournament) return;
      if (!scheduleItems) return;
      const { eventKey, tournamentKey, teamKeys } = eventSchedule;
      const { fieldCount: fields, name } = tournament;
      const matches = await createMatchSchedule({
        eventKey,
        tournamentKey,
        quality,
        fields,
        matchesPerTeam: 5, // TODO: Make this configurable????
        teamsParticipating: teamKeys.length,
        teamsPerAlliance: eventSchedule.options.teamsPerAlliance,
        teamKeys,
        name
      });
      onCreateMatches(
        assignMatchTimes(
          eventSchedule.hasPremiereField
            ? FGCSchedule.FGC2025.assignFields(matches)
            : matches,
          scheduleItems
        )
      );
      showSnackbar('MatchMaker executed successfully.');
      setLoading(false);
    } catch (e) {
      setLoading(false);
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while executing matchmaker.', error);
    }
  };
  return (
    <Row gutter={16}>
      <Col xs={24} sm={12} md={20}>
        <MatchMakerQualityDropdown quality={quality} onChange={setQuality} />
      </Col>
      <Col xs={24} sm={12} md={4} style={{ marginTop: 14 }}>
        <Button
          type='primary'
          disabled={loading}
          onClick={createMatches}
          loading={loading}
          style={{ width: '100%' }}
        >
          Create Match Schedule
        </Button>
      </Col>
    </Row>
  );
};
