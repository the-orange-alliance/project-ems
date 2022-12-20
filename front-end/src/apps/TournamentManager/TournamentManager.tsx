import { FC } from 'react';
import Typography from '@mui/material/Typography';
import PaperLayout from 'src/layouts/PaperLayout';

const TournamentManager: FC = () => {
  return (
    <PaperLayout
      containerWidth='xl'
      header={<Typography variant='h4'>Tournament Manager</Typography>}
      padding
    >
      <div>hello world</div>
    </PaperLayout>
  );
};

export default TournamentManager;
