import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MatchReport from './components/MatchReport';
import { ReportProps } from '.';
import MatchByTeamReport from './components/MatchByTeamReport';
import {
  matchesByTournamentSelector,
  currentTeamsByEventSelector,
  teamIdentifierAtom,
  currentRankingsByTournamentSelector
} from 'src/stores/NewRecoil';
import { useSeasonComponents } from 'src/hooks/use-season-components';

const TournamentReports: FC<ReportProps> = ({ onGenerate }) => {
  const identifier = useRecoilValue(teamIdentifierAtom);
  const matches = useRecoilValue(matchesByTournamentSelector);
  const teams = useRecoilValue(currentTeamsByEventSelector);
  const rankings = useRecoilValue(currentRankingsByTournamentSelector);

  const seasonComponents = useSeasonComponents();

  const generateScheduleReport = () =>
    onGenerate(<MatchReport matches={matches} identifier={identifier} />);

  const generateRankingReport = () => {
    if (seasonComponents?.RankingsReport) {
      onGenerate(<seasonComponents.RankingsReport rankings={rankings ?? []} />);
    }
  };

  const generateScheduleByTeamReport = () =>
    onGenerate(
      <MatchByTeamReport
        teams={teams}
        matches={matches}
        identifier={identifier}
      />
    );

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

export default TournamentReports;
