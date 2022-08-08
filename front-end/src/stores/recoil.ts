import { User } from '@toa-lib/models';
import { atom } from 'recoil';

export const darkModeAtom = atom<boolean>({
  key: 'darkModeAtom',
  default: false
});

export const userAtom = atom<User | null>({
  key: 'userAtom',
  default: null
});
