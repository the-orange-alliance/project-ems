import { FC } from 'react';
import { useAtomValue } from 'jotai';
import { Button, Row, Col } from 'antd';
import { MatchReport } from './components/match-report.js';
import { ReportProps } from './index.js';
import { MatchByTeamReport } from './components/match-by-team-report.js';
import { teamIdentifierAtom } from 'src/stores/state/index.js';
import { useSeasonComponents } from 'src/hooks/use-season-components.js';
import { useMatchesForTournament } from 'src/api/use-match-data.js';
import { useTeamsForEvent } from 'src/api/use-team-data.js';
import { useRankingsForTournament } from 'src/api/use-ranking-data.js';
import { useScheduleItemsForTournament } from 'src/api/use-schedule-data.js';
import { useCurrentTournament } from 'src/api/use-tournament-data.js';

export const TournamentReports: FC<ReportProps> = ({
  eventKey,
  tournamentKey,
  onGenerate
}) => {
  const identifier = useAtomValue(teamIdentifierAtom);
  const tournament = useCurrentTournament();
  const { data: matches } = useMatchesForTournament(eventKey, tournamentKey);
  const { data: teams } = useTeamsForEvent(eventKey);
  const { data: rankings } = useRankingsForTournament(eventKey, tournamentKey);
  const { data: scheduleItems } = useScheduleItemsForTournament(
    eventKey,
    tournamentKey
  );

  const seasonComponents = useSeasonComponents();

  const generateScheduleReport = () => {
    if (!tournament || !matches || !teams || !scheduleItems) return;
    onGenerate(
      <MatchReport
        tournament={tournament}
        matches={matches}
        teams={teams}
        items={scheduleItems}
        identifier={identifier}
      />
    );
  };
  const generateRankingReport = () => {
    if (seasonComponents?.RankingsReport) {
      onGenerate(<seasonComponents.RankingsReport rankings={rankings ?? []} />);
    }
  };

  const generateScheduleByTeamReport = () => {
    if (!teams || !matches) return;
    onGenerate(
      <MatchByTeamReport
        teams={teams}
        matches={matches}
        identifier={identifier}
      />
    );
  };

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Button type='primary' block onClick={generateScheduleReport}>
          Schedule Report
        </Button>
      </Col>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Button type='primary' block onClick={generateScheduleByTeamReport}>
          Schedule By Team Report
        </Button>
      </Col>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Button
          type='primary'
          block
          onClick={generateRankingReport}
          disabled={!seasonComponents?.RankingsReport}
        >
          Ranking Report
        </Button>
      </Col>
    </Row>
  );
};
