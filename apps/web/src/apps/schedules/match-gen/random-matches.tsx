import { Button, Col, Row } from 'antd';
import {
  ScheduleParams,
  Match,
  ScheduleItem,
  Tournament,
  assignMatchTimes,
  getSeasonKeyFromEventKey
} from '@toa-lib/models';
import { FGCSchedule } from '@toa-lib/models';
import { FC, useState } from 'react';
import { matchApi } from 'src/api/use-match-data.js';
import { MatchMakerQualityDropdown } from 'src/components/dropdowns/match-maker-dropdown.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { useTeamsForEvent } from 'src/api/use-team-data.js';

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
  const { showSnackbar, showErrorSnackbar } = useSnackbar();
  const { data: teams } = useTeamsForEvent(eventSchedule?.eventKey);
  const createMatches = async () => {
    setLoading(true);
    try {
      if (!eventSchedule) return;
      if (!tournament) return;
      if (!scheduleItems) return;
      const { eventKey, tournamentKey, teamKeys } = eventSchedule;

      // A participant with no team number produces a match slot that renders
      // blank everywhere (no identifier to show), so the resulting schedule is
      // unusable. Fail loudly and name the offenders instead of running the
      // matchmaker and reporting success over an unreadable schedule.
      const numberless = (teams ?? [])
        .filter((t) => teamKeys.includes(t.teamKey))
        .filter((t) => !String(t.teamNumber).trim());
      if (numberless.length > 0) {
        const names = numberless
          .map((t) => t.teamNameShort || t.teamNameLong || `team ${t.teamKey}`)
          .join(', ');
        showErrorSnackbar(
          'Cannot create a match schedule.',
          `${numberless.length} selected participant(s) have no Team Number: ${names}. Set a Team Number for each, or remove them from the participant list.`
        );
        setLoading(false);
        return;
      }
      const { fieldCount: fields, name } = tournament;
      const matches = await matchApi.create.schedule({
        eventKey,
        tournamentKey,
        quality,
        fields,
        matchesPerTeam: eventSchedule.matchesPerTeam,
        teamsParticipating: teamKeys.length,
        teamsPerAlliance: eventSchedule.options.teamsPerAlliance,
        teamKeys,
        name
      });
      const assignPremiereFields = (matches: Match<any>[]) => {
        const seasonKey = getSeasonKeyFromEventKey(eventKey);
        switch (seasonKey) {
          case 'fgc_2026':
            return FGCSchedule.FGC2026.assignFields(matches);
          case 'fgc_2025':
          default:
            return FGCSchedule.FGC2025.assignFields(matches);
        }
      };
      onCreateMatches(
        assignMatchTimes(
          eventSchedule.hasPremiereField
            ? assignPremiereFields(matches)
            : matches,
          scheduleItems
        )
      );
      showSnackbar('MatchMaker executed successfully.');
      setLoading(false);
    } catch (e) {
      setLoading(false);
      showErrorSnackbar('Error while executing matchmaker.', e);
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
