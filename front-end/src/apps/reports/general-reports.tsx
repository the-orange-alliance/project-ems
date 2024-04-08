import { FC } from 'react';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import { TeamsReport } from './components/teams-report';
import { ReportProps } from '.';
import { useTeamsForEvent } from 'src/api/use-team-data';

export const GeneralReports: FC<ReportProps> = ({ eventKey, onGenerate }) => {
  const { data: teams } = useTeamsForEvent(eventKey);

  const generateTeamReport = () => {
    if (!teams) return;
    onGenerate(<TeamsReport teams={teams} />);
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <Button variant='contained' fullWidth onClick={generateTeamReport}>
          Competing Teams Report
        </Button>
      </Grid>
    </Grid>
  );
};
