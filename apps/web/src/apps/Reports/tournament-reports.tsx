import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import { MatchReport } from './components/match-report';
import { ReportProps } from '.';
import { MatchByTeamReport } from './components/match-by-team-report';
import { teamIdentifierAtom } from 'src/stores/recoil';
import { useSeasonComponents } from 'src/hooks/use-season-components';
import { useMatchesForTournament } from 'src/api/use-match-data';
import { useTeamsForEvent } from 'src/api/use-team-data';
import { useRankingsForTournament } from 'src/api/use-ranking-data';
import { useScheduleItemsForTournament } from 'src/api/use-schedule-data';
import { useCurrentTournament } from 'src/api/use-tournament-data';

export const TournamentReports: FC<ReportProps> = ({
  eventKey,
  tournamentKey,
  onGenerate
}) => {
  const identifier = useRecoilValue(teamIdentifierAtom);
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
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <Button variant='contained' fullWidth onClick={generateScheduleReport}>
          Schedule Report
        </Button>
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <Button
          variant='contained'
          fullWidth
          onClick={generateScheduleByTeamReport}
        >
          Schedule By Team Report
        </Button>
      </Grid>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <Button variant='contained' fullWidth onClick={generateRankingReport}>
          Ranking Report
        </Button>
      </Grid>
    </Grid>
  );
};
