import { FC } from 'react';
import { useSyncUrlToRecoil } from 'src/hooks/use-sync-url';
import { useSyncFieldsToRecoil } from './sync-fields-to-recoil';

const SyncEffects: FC = () => {
  useSyncUrlToRecoil();
  useSyncFieldsToRecoil();
  return null;
};

export default SyncEffects;
