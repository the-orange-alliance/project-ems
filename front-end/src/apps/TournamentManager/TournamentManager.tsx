import { FC } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PaperLayout from '@layouts/PaperLayout';
import Tournaments from './components/Tournaments';

const TournamentManager: FC = () => {
  return (
    <PaperLayout
      containerWidth='xl'
      header={<Typography variant='h4'>Tournament Manager</Typography>}
      padding
    >
      <Box sx={{ marginBottom: (theme) => theme.spacing(2) }}>
        <Tournaments />
      </Box>
    </PaperLayout>
  );
};

export default TournamentManager;
