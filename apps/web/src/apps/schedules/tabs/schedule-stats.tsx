import { FC, useMemo } from 'react';
import { Col, Divider, Row, Statistic } from 'antd';
import { DateTime } from 'luxon';
import { Match, ScheduleParams } from '@toa-lib/models';
import { useTeamsForEvent } from 'src/api/use-team-data.js';
import { useCurrentTournament } from 'src/api/use-tournament-data.js';
import { UpgradedTable } from 'src/components/tables/upgraded-table.js';
import { useTeamIdentifierRecord } from 'src/hooks/use-team-identifier.js';
import {
  calculateScheduleStats,
  TeamScheduleStats
} from '../util/match-schedule-stats.js';
import { matchesAtom } from 'src/stores/state/event.js';
import { useAtomValue } from 'jotai';

interface Props {
  eventSchedule?: ScheduleParams;
  savedMatches?: Match<any>[];
}

export const ScheduleStats: FC<Props> = ({ eventSchedule }) => {
  const tournament = useCurrentTournament();
  const { data: teams } = useTeamsForEvent(eventSchedule?.eventKey);
  const identifiers = useTeamIdentifierRecord(teams ?? []);
  const matches = useAtomValue(matchesAtom).filter(
    (m) => m.tournamentKey === tournament?.tournamentKey
  );
  const { teams: teamStats, surrogateAppearances } = useMemo(
    () => calculateScheduleStats(matches),
    [matches]
  );

  if (!eventSchedule) return <div>Please select a tournament.</div>;
  if (matches.length === 0) return <div>No matches have been scheduled.</div>;

  const teamLabel = (teamKey: number) => identifiers[teamKey] ?? teamKey;
  const averageOverTeams = (pick: (t: TeamScheduleStats) => number) =>
    teamStats.reduce((sum, t) => sum + pick(t), 0) / (teamStats.length || 1);
  // Field numbers are 1-based indices into the tournament's field names.
  const fieldNames = tournament?.fields ?? [];
  const teamHeaders = [
    'Team',
    'Matches',
    'Surrogate Matches',
    'Unique Teammates',
    'Unique Opponents',
    ...fieldNames
  ];

  return (
    <>
      <Row gutter={16}>
        <Col flex={1}>
          <Statistic title='Matches' value={matches.length} />
        </Col>
        <Col flex={1}>
          <Statistic title='Teams' value={teamStats.length} />
        </Col>
        <Col flex={1}>
          <Statistic
            title='Surrogate Appearances'
            value={surrogateAppearances.length}
          />
        </Col>
        <Col flex={1}>
          <Statistic
            title='Avg. Unique Teammates'
            value={averageOverTeams((t) => t.uniqueTeammates)}
            precision={2}
          />
        </Col>
        <Col flex={1}>
          <Statistic
            title='Avg. Unique Opponents'
            value={averageOverTeams((t) => t.uniqueOpponents)}
            precision={2}
          />
        </Col>
      </Row>
      <Divider>Surrogate Matches</Divider>
      <UpgradedTable
        data={surrogateAppearances}
        rowKey='key'
        headers={['Team', 'Match', 'Field', 'Time']}
        sortable
        columnSorters={{
          Time: (a, b) =>
            DateTime.fromISO(a.scheduledTime).toMillis() -
            DateTime.fromISO(b.scheduledTime).toMillis()
        }}
        renderRow={(a) => [
          teamLabel(a.teamKey),
          a.matchName,
          fieldNames[a.fieldNumber - 1] ?? a.fieldNumber,
          DateTime.fromISO(a.scheduledTime).toLocaleString(
            DateTime.DATETIME_FULL
          )
        ]}
      />
      <Divider>Team Statistics</Divider>
      <UpgradedTable
        data={teamStats}
        rowKey='teamKey'
        headers={teamHeaders}
        sortable
        renderRow={(t) => [
          teamLabel(t.teamKey),
          t.matchCount,
          t.surrogateCount,
          t.uniqueTeammates,
          t.uniqueOpponents,
          ...fieldNames.map((_, i) => t.fieldCounts[i + 1] ?? 0)
        ]}
      />
    </>
  );
};
