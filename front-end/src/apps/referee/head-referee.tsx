import { FC } from 'react';
import { Box } from '@mui/material';
import { useSeasonComponents } from 'src/hooks/use-season-components';
import RefereeLayout from 'src/layouts/RefereeLayout';
import { SyncMatchOccurringToRecoil } from 'src/components/sync-effects/sync-match-occurring-to-recoil';
import { SyncMatchStateToRecoil } from 'src/components/sync-effects/sync-match-state-to-recoil';
import { SyncMatchesToRecoil } from 'src/components/sync-effects/sync-matches-to-recoi';

export const HeadReferee: FC = () => {
  const seasonComponents = useSeasonComponents();

  if (!seasonComponents) {
    return (
      <div>Uh oh, something bad happened. Contact event software support.</div>
    );
  }

  return (
    <RefereeLayout containerWidth='xl'>
      <SyncMatchStateToRecoil />
      <SyncMatchesToRecoil />
      <SyncMatchOccurringToRecoil />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
          <seasonComponents.RefereeScoreSheet alliance='red' />
          <seasonComponents.RefereeScoreSheet alliance='blue' />
        </Box>
      </Box>
    </RefereeLayout>
  );
};
