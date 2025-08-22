import { FC } from 'react';
import { useSeasonComponents } from 'src/hooks/use-season-components';
import { RefereeLayout } from 'src/layouts/referee-layout';
import { SyncMatchOccurringToRecoil } from 'src/components/sync-effects/sync-match-occurring.js';
import { SyncMatchStateToRecoil } from 'src/components/sync-effects/sync-match-state.js';
import { SyncMatchesToRecoil } from 'src/components/sync-effects/sync-matches-to-recoi';

export const HeadRefereeMin: FC = () => {
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
      {seasonComponents.HeadRefExtrasSheet && (
        <seasonComponents.HeadRefExtrasSheet />
      )}
    </RefereeLayout>
  );
};
