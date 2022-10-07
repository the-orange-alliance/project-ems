import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import { teamsAtom } from 'src/stores/Recoil';
import TeamsReport from './components/TeamsReport';
import { ReportProps } from '.';

const GeneralReports: FC<ReportProps> = ({ onGenerate }) => {
  const teams = useRecoilValue(teamsAtom);

  const generateTeamReport = () => onGenerate(<TeamsReport teams={teams} />);

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

export default GeneralReports;
