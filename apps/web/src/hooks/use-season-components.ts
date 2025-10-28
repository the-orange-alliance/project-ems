import { getSeasonKeyFromEventKey } from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { useComponents, useFieldControl } from 'src/seasons/index.js';
import { eventKeyAtom } from 'src/stores/state/event.js';

export const useSeasonComponents = () => {
  const eventKey = useAtomValue(eventKeyAtom);
  const seasonKey = getSeasonKeyFromEventKey(eventKey ?? '');
  return useComponents(seasonKey);
};

export const useSeasonFieldControl = () => {
  const eventKey = useAtomValue(eventKeyAtom);
  const seasonKey = getSeasonKeyFromEventKey(eventKey ?? '');
  return useFieldControl(seasonKey);
};
