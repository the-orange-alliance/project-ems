import { atom, RecoilValueReadOnly, selector } from 'recoil';
import { localStorageEffect } from 'src/stores/Effects';
import {
  defaultFieldOptions,
  FcsPackets,
  FieldOptions,
  getFcsPackets
} from '@toa-lib/models';

export const redServoHoldPositionPulseWidthAtom = atom({
  key: 'fgc2023_redServoHoldPositionPulseWidth',
  default: defaultFieldOptions.redServoHoldPositionPulseWidth,
  effects: [localStorageEffect('redServoHoldPositionPulseWidth')]
});

export const redServoReleasedPositionPulseWidthAtom = atom({
  key: 'fgc2023_redServoReleasedPositionPulseWidth',
  default: defaultFieldOptions.redServoReleasedPositionPulseWidth,
  effects: [localStorageEffect('redServoReleasedPositionPulseWidth')]
});

export const blueServoHoldPositionPulseWidthAtom = atom({
  key: 'fgc2023_blueServoHoldPositionPulseWidth',
  default: defaultFieldOptions.blueServoHoldPositionPulseWidth,
  effects: [localStorageEffect('blueServoHoldPositionPulseWidth')]
});

export const blueServoReleasedPositionPulseWidthAtom = atom({
  key: 'fgc2023_blueServoReleasedPositionPulseWidth',
  default: defaultFieldOptions.blueServoReleasedPositionPulseWidth,
  effects: [localStorageEffect('blueServoReleasedPositionPulseWidth')]
});

export const fieldOptionsSelector: RecoilValueReadOnly<FieldOptions> = selector(
  {
    key: 'fgc2023_fieldOptions',
    get: ({ get }) => {
      return {
        redServoHoldPositionPulseWidth: get(redServoHoldPositionPulseWidthAtom),
        redServoReleasedPositionPulseWidth: get(
          redServoReleasedPositionPulseWidthAtom
        ),
        blueServoHoldPositionPulseWidth: get(
          blueServoHoldPositionPulseWidthAtom
        ),
        blueServoReleasedPositionPulseWidth: get(
          blueServoReleasedPositionPulseWidthAtom
        )
      };
    }
  }
);

export const fcsPacketsSelector: RecoilValueReadOnly<FcsPackets> = selector({
  key: 'fgc2023_fcsPackets',
  get: ({ get }) => {
    return getFcsPackets(get(fieldOptionsSelector));
  }
});
