import { FC } from 'react';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import PaperLayout from 'src/layouts/PaperLayout';

const Reports: FC = () => {
  return (
    <PaperLayout
      containerWidth='xl'
      header={<Typography variant='h4'>Reports</Typography>}
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
    </PaperLayout>
  );
};

export default Reports;
