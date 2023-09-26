import { atom } from 'recoil';
import { localStorageEffect } from 'src/stores/Effects';

export const redServoHoldPositionPulseWidthAtom = atom({
  key: 'fgc2023_redServoHoldPositionPulseWidth',
  default: 0,
  effects: [localStorageEffect('redServoHoldPositionPulseWidth')]
});

export const redServoReleasedPositionPulseWidthAtom = atom({
  key: 'fgc2023_redServoReleasedPositionPulseWidth',
  default: 0,
  effects: [localStorageEffect('redServoReleasedPositionPulseWidth')]
});

export const blueServoHoldPositionPulseWidthAtom = atom({
  key: 'fgc2023_blueServoHoldPositionPulseWidth',
  default: 0,
  effects: [localStorageEffect('blueServoHoldPositionPulseWidth')]
});

export const blueServoReleasedPositionPulseWidthAtom = atom({
  key: 'fgc2023_blueServoReleasedPositionPulseWidth',
  default: 0,
  effects: [localStorageEffect('blueServoReleasedPositionPulseWidth')]
});
