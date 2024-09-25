import { FC } from 'react';
import { useSyncUrlToRecoil } from 'src/hooks/use-sync-url';
import { useSyncFieldsToRecoil } from 'src/components/sync-effects/sync-fields-to-recoil';

const SyncEffects: FC = () => {
  useSyncUrlToRecoil();
  useSyncFieldsToRecoil();
  return null;
};

export default SyncEffects;
