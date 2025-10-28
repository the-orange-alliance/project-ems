import { FC } from 'react';
import { useSyncUrlToRecoil } from 'src/hooks/use-sync-url.js';
import { SyncMatchState } from 'src/components/sync-effects/sync-match-state.js';
// import { useSyncFieldsToRecoil } from 'src/components/sync-effects/sync-fields-to-recoil.js';

const SyncEffects: FC = () => {
  useSyncUrlToRecoil();
  // useSyncFieldsToRecoil();
  return (
    <>
      <SyncMatchState />
    </>
  );
};

export default SyncEffects;
