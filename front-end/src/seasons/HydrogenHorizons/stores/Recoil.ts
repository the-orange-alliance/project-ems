import { atom } from 'recoil';

export const motorOneOpenPositionAtom = atom({
  key: 'fgc2023_motorOneOpenPosition',
  default: 0
});

export const motorOneClosePositionAtom = atom({
  key: 'fgc2023_motorOneClosePosition',
  default: 0
});

export const motorTwoServoPositionAtom = atom({
  key: 'fgc2023_motorTwoOpenPosition',
  default: 0
});

export const motorTwoClosePositionAtom = atom({
  key: 'fgc2023_motorTwoClosePosition',
  default: 0
});
