import { getSeasonKeyFromEventKey } from '@toa-lib/models';
import { useRecoilValue } from 'recoil';
import { useComponents } from 'src/seasons';
import { currentEventKeySelector } from 'src/stores/NewRecoil';

export const useSeasonComponents = () => {
  const seasonKey = getSeasonKeyFromEventKey(
    useRecoilValue(currentEventKeySelector)
  );
  return useComponents(seasonKey);
};
