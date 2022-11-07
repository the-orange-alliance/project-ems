import { FC } from 'react';
import PaperLayout from 'src/layouts/PaperLayout';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Teams from './components/Teams';

const TeamManager: FC = () => {
  return (
    <PaperLayout
      containerWidth='lg'
      header={<Typography variant='h4'>Team Manager</Typography>}
      padding
    >
      <Box sx={{ marginBottom: (theme) => theme.spacing(2) }}>
        <Teams />
      </Box>
    </PaperLayout>
  );
};
export default TeamManager;
