import { atom } from 'recoil';
import { localStorageEffect } from 'src/stores/Effects';

export const motorOneOpenPositionAtom = atom({
  key: 'fgc2023_motorOneOpenPosition',
  default: 0,
  effects: [localStorageEffect('motorOneOpenPosition')]
});

export const motorOneClosePositionAtom = atom({
  key: 'fgc2023_motorOneClosePosition',
  default: 0,
  effects: [localStorageEffect('motorOneClosePosition')]
});

export const motorTwoOpenPositionAtom = atom({
  key: 'fgc2023_motorTwoOpenPosition',
  default: 0,
  effects: [localStorageEffect('motorTwoOpenPosition')]
});

export const motorTwoClosePositionAtom = atom({
  key: 'fgc2023_motorTwoClosePosition',
  default: 0,
  effects: [localStorageEffect('motorTwoClosePosition')]
});
