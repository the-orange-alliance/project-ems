import { FC, useState } from 'react';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import PaperLayout from 'src/layouts/PaperLayout';
import TournamentDropdown from 'src/components/Dropdowns/TournamentDropdown';
import TwoColumnHeader from 'src/components/Headers/TwoColumnHeader';
import { TEST_LEVEL } from '@toa-lib/models';
import GeneralReports from './GeneralReports';

const Reports: FC = () => {
  const [selectedType, setSelectedType] = useState(TEST_LEVEL);

  const handleTournamentChange = (value: number) => setSelectedType(value);

  return (
    <PaperLayout
      containerWidth='xl'
      header={
        <TwoColumnHeader
          left={<Typography variant='h4'>Reports</Typography>}
          right={
            <TournamentDropdown
              value={selectedType}
              onChange={handleTournamentChange}
            />
          }
        />
      }
    >
      <Grid container spacing={3} sx={{ padding: (theme) => theme.spacing(2) }}>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Button variant='contained' fullWidth>
            Teams Report
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Button variant='contained' fullWidth>
            Schedule Report
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Button variant='contained' fullWidth>
            Schedule Report
          </Button>
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Button variant='contained' fullWidth>
            Schedule Report
          </Button>
        </Grid>
      </Grid>
      <GeneralReports />
    </PaperLayout>
  );
};

export default Reports;
