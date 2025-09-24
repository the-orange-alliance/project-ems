import { useAtomValue } from 'jotai';
import { syncApiKeyAtom, syncPlatformAtom } from 'src/stores/state/index.js';

export const useSyncConfig = () => {
  const apiKey = useAtomValue(syncApiKeyAtom);
  const platform = useAtomValue(syncPlatformAtom);

  return {
    apiKey,
    platform
  };
};
