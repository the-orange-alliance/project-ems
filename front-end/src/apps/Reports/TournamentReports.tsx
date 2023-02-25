import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import MatchReport from './components/MatchReport';
import { ReportProps } from '.';
// import RankingReport from './components/RankingReport';
import MatchByTeamReport from './components/MatchByTeamReport';
import {
  matchesByTournamentSelector,
  currentTeamsByEventSelector
} from 'src/stores/NewRecoil';

const TournamentReports: FC<ReportProps> = ({ onGenerate }) => {
  const matches = useRecoilValue(matchesByTournamentSelector);
  const teams = useRecoilValue(currentTeamsByEventSelector);
  // const levelRankings = useRecoilValue(rankings(level));

  const generateScheduleReport = () =>
    onGenerate(<MatchReport matches={matches} identifier='city' />);

  // const generateRankingReport = () =>
  //   onGenerate(<RankingReport rankings={levelRankings} identifier='city' />);

  const generateScheduleByTeamReport = () =>
    onGenerate(
      <MatchByTeamReport teams={teams} matches={matches} identifier='city' />
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
        <Button variant='contained' fullWidth>
          Ranking Report
        </Button>
      </Grid>
    </Grid>
  );
};

export default TournamentReports;
