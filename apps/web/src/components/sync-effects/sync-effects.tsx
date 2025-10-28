import { FC } from 'react';
import { useSyncUrlToRecoil } from 'src/hooks/use-sync-url.js';
import { SyncMatchState } from 'src/components/sync-effects/sync-match-state.js';
import { SyncOnPrestart } from './sync-on-prestart.js';
import { SyncOnCommit } from './sync-on-commit.js';
// import { SyncMatchOccurring } from './sync-match-occurring.js';
import { useSyncFields } from './sync-fields.js';
import { useSyncInProgress } from './sync-in-progress.js';

const SyncEffects: FC = () => {
  useSyncUrlToRecoil();
  useSyncFields();
  useSyncInProgress();
  return (
    <>
      <SyncMatchState />
      <SyncOnPrestart />
      <SyncOnCommit />
      {/* <SyncMatchOccurring /> */}
    </>
  );
};

export default SyncEffects;
