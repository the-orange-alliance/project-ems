import { FC } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import PaperLayout from '@layouts/PaperLayout';

const TournamentManager: FC = () => {
  return (
    <PaperLayout
      containerWidth='xl'
      header={<Typography variant='h4'>Tournament Manager</Typography>}
      padding
    >
      <Box>hello world</Box>
    </PaperLayout>
  );
};

export default TournamentManager;
