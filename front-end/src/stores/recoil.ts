import { atom } from 'recoil';

export const darkModeAtom = atom({
  key: 'darkModeAtom',
  default: false
});

export const userAtom = atom({
  key: 'userAtom',
  default: null
});
