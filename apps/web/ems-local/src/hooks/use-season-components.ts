import { getSeasonKeyFromEventKey } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { useComponents, useFieldControl } from 'src/seasons/index.js';
import { eventKeyAtom } from 'src/stores/state/event.js';

export const useSeasonComponents = () => {
  const seasonKey = getSeasonKeyFromEventKey(
    useAtomValue(eventKeyAtom) ?? ""
  );
  return useComponents(seasonKey);
};

export const useSeasonFieldControl = () => {
  const seasonKey = getSeasonKeyFromEventKey(
    useAtomValue(eventKeyAtom) ?? ""
  );
  return useFieldControl(seasonKey);
};
