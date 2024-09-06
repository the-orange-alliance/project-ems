import { atom } from 'recoil';

export const testAtom = atom<boolean>({
  key: 'ftf.testAtom',
  default: false
});
