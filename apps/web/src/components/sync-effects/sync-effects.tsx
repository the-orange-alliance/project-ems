import { FC } from 'react';
import { useSyncUrlToRecoil } from 'src/hooks/use-sync-url.js';
import { useSyncFields } from './sync-fields.js';
import { useSyncInProgress } from './sync-in-progress.js';

const SyncEffects: FC = () => {
  useSyncUrlToRecoil();
  useSyncFields();
  useSyncInProgress();
  return null;
};

export default SyncEffects;
