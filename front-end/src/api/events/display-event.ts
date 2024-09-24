import { useRecoilCallback } from 'recoil';
import { displayIdAtom } from 'src/stores/recoil';

export const useDisplayEvent = () => {
  return useRecoilCallback(({ set }) => async (id: number) => {
    set(displayIdAtom, id);
  });
};
