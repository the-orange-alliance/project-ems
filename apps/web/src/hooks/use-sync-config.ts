import { useRecoilValue } from 'recoil';
import { syncApiKeyAtom, syncPlatformAtom } from 'src/stores/recoil';

export const useSyncConfig = () => {
  const apiKey = useRecoilValue(syncApiKeyAtom);
  const platform = useRecoilValue(syncPlatformAtom);

  return {
    apiKey,
    platform
  };
};
