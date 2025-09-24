import { useSetAtom } from 'jotai';
import { displayIdAtom } from 'src/stores/state/audience-display.js';

export const useDisplayEvent = () => {
  const setDisplay = useSetAtom(displayIdAtom)
  return (id: number) => setDisplay(id);
};
