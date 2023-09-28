import { FC } from 'react';
import { Box } from '@mui/material';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import MatchStateListener from 'src/components/MatchStateListener/MatchStateListener';
import MatchUpdateListener from 'src/components/MatchUpdateListener/MatchUpdateListener';
import { useSeasonComponents } from 'src/hooks/use-season-components';
import RefereeLayout from 'src/layouts/RefereeLayout';

const HeadReferee: FC = () => {
  const seasonComponents = useSeasonComponents();

  if (!seasonComponents) {
    return (
      <div>Uh oh, something bad happened. Contact event software support.</div>
    );
  }

  return (
    <RefereeLayout containerWidth='xl'>
      <PrestartListener />
      <MatchStateListener />
      <MatchUpdateListener />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
          <seasonComponents.RefereeScoreSheet alliance='red' />
          <seasonComponents.RefereeScoreSheet alliance='blue' />
        </Box>
      </Box>
    </RefereeLayout>
  );
};

export default HeadReferee;
