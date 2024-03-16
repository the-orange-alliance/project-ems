import { FC } from 'react';
import { useSyncUrlToRecoil } from 'src/hooks/use-sync-url';

const SyncEffects: FC = () => {
  useSyncUrlToRecoil();
  return null;
};

export default SyncEffects;
