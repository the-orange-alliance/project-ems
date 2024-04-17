import { getSeasonKeyFromEventKey } from '@toa-lib/models';
import { useRecoilValue } from 'recoil';
import { useComponents } from 'src/seasons';
import { currentEventKeyAtom } from 'src/stores/recoil';

export const useSeasonComponents = () => {
  const seasonKey = getSeasonKeyFromEventKey(
    useRecoilValue(currentEventKeyAtom)
  );
  return useComponents(seasonKey);
};
