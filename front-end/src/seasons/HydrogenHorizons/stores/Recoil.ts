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

export const prepareFieldBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_prepareFieldBlinkinPulseWidth',
  default: defaultFieldOptions.prepareFieldBlinkinPulseWidth,
  effects: [localStorageEffect('prepareFieldBlinkinPulseWidth')]
});

export const fieldFaultBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_fieldFaultBlinkinPulseWidth',
  default: defaultFieldOptions.fieldFaultBlinkinPulseWidth,
  effects: [localStorageEffect('fieldFaultBlinkinPulseWidth')]
});

export const solidRedBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_solidRedBlinkinPulseWidth',
  default: defaultFieldOptions.solidRedBlinkinPulseWidth,
  effects: [localStorageEffect('solidRedBlinkinPulseWidth')]
});

export const solidBlueBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_solidBlueBlinkinPulseWidth',
  default: defaultFieldOptions.solidBlueBlinkinPulseWidth,
  effects: [localStorageEffect('solidBlueBlinkinPulseWidth')]
});

export const allClearBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_allClearBlinkinPulseWidth',
  default: defaultFieldOptions.allClearBlinkinPulseWidth,
  effects: [localStorageEffect('allClearBlinkinPulseWidth')]
});

export const redEndgameOxygenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_redEndgameOxygenGoalBlinkinPulseWidth',
  default: defaultFieldOptions.redEndgameOxygenGoalBlinkinPulseWidth,
  effects: [localStorageEffect('redEndgameOxygenGoalBlinkinPulseWidth')]
});

export const blueEndgameOxygenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_blueEndgameOxygenGoalBlinkinPulseWidth',
  default: defaultFieldOptions.blueEndgameOxygenGoalBlinkinPulseWidth,
  effects: [localStorageEffect('blueEndgameOxygenGoalBlinkinPulseWidth')]
});

export const redEndgameHydrogenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_redEndgameHydrogenGoalBlinkinPulseWidth',
  default: defaultFieldOptions.redEndgameHydrogenGoalBlinkinPulseWidth,
  effects: [localStorageEffect('redEndgameHydrogenGoalBlinkinPulseWidth')]
});

export const blueEndgameHydrogenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_blueEndgameHydrogenGoalBlinkinPulseWidth',
  default: defaultFieldOptions.blueEndgameHydrogenGoalBlinkinPulseWidth,
  effects: [localStorageEffect('blueEndgameHydrogenGoalBlinkinPulseWidth')]
});

export const redEndgameButtonBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_redEndgameButtonBlinkinPulseWidth',
  default: defaultFieldOptions.redEndgameButtonBlinkinPulseWidth,
  effects: [localStorageEffect('redEndgameButtonBlinkinPulseWidth')]
});

export const blueEndgameButtonBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_blueEndgameButtonBlinkinPulseWidth',
  default: defaultFieldOptions.blueEndgameButtonBlinkinPulseWidth,
  effects: [localStorageEffect('blueEndgameButtonBlinkinPulseWidth')]
});

export const redCombinedOxygenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_redCombinedOxygenGoalBlinkinPulseWidth',
  default: defaultFieldOptions.redCombinedOxygenGoalBlinkinPulseWidth,
  effects: [localStorageEffect('redCombinedOxygenGoalBlinkinPulseWidth')]
});

export const blueCombinedOxygenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_blueCombinedOxygenGoalBlinkinPulseWidth',
  default: defaultFieldOptions.blueCombinedOxygenGoalBlinkinPulseWidth,
  effects: [localStorageEffect('blueCombinedOxygenGoalBlinkinPulseWidth')]
});

export const redCombinedHydrogenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_redCombinedHydrogenGoalBlinkinPulseWidth',
  default: defaultFieldOptions.redCombinedHydrogenGoalBlinkinPulseWidth,
  effects: [localStorageEffect('redCombinedHydrogenGoalBlinkinPulseWidth')]
});

export const blueCombinedHydrogenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_blueCombinedHydrogenGoalBlinkinPulseWidth',
  default: defaultFieldOptions.blueCombinedHydrogenGoalBlinkinPulseWidth,
  effects: [localStorageEffect('blueCombinedHydrogenGoalBlinkinPulseWidth')]
});

export const redCombinedButtonBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_redCombinedButtonBlinkinPulseWidth',
  default: defaultFieldOptions.redCombinedButtonBlinkinPulseWidth,
  effects: [localStorageEffect('redCombinedButtonBlinkinPulseWidth')]
});

export const blueCombinedButtonBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_blueCombinedButtonBlinkinPulseWidth',
  default: defaultFieldOptions.blueCombinedButtonBlinkinPulseWidth,
  effects: [localStorageEffect('blueCombinedButtonBlinkinPulseWidth')]
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
        ),
        prepareFieldBlinkinPulseWidth: get(prepareFieldBlinkinPulseWidthAtom),
        fieldFaultBlinkinPulseWidth: get(fieldFaultBlinkinPulseWidthAtom),
        solidRedBlinkinPulseWidth: get(solidRedBlinkinPulseWidthAtom),
        solidBlueBlinkinPulseWidth: get(solidBlueBlinkinPulseWidthAtom),
        allClearBlinkinPulseWidth: get(allClearBlinkinPulseWidthAtom),
        redEndgameOxygenGoalBlinkinPulseWidth: get(
          redEndgameOxygenGoalBlinkinPulseWidthAtom
        ),
        blueEndgameOxygenGoalBlinkinPulseWidth: get(
          blueEndgameOxygenGoalBlinkinPulseWidthAtom
        ),
        redEndgameHydrogenGoalBlinkinPulseWidth: get(
          redEndgameHydrogenGoalBlinkinPulseWidthAtom
        ),
        blueEndgameHydrogenGoalBlinkinPulseWidth: get(
          blueEndgameHydrogenGoalBlinkinPulseWidthAtom
        ),
        redEndgameButtonBlinkinPulseWidth: get(
          redEndgameButtonBlinkinPulseWidthAtom
        ),
        blueEndgameButtonBlinkinPulseWidth: get(
          blueEndgameButtonBlinkinPulseWidthAtom
        ),
        redCombinedOxygenGoalBlinkinPulseWidth: get(
          redCombinedOxygenGoalBlinkinPulseWidthAtom
        ),
        blueCombinedOxygenGoalBlinkinPulseWidth: get(
          blueCombinedOxygenGoalBlinkinPulseWidthAtom
        ),
        redCombinedHydrogenGoalBlinkinPulseWidth: get(
          redCombinedHydrogenGoalBlinkinPulseWidthAtom
        ),
        blueCombinedHydrogenGoalBlinkinPulseWidth: get(
          blueCombinedHydrogenGoalBlinkinPulseWidthAtom
        ),
        redCombinedButtonBlinkinPulseWidth: get(
          redCombinedButtonBlinkinPulseWidthAtom
        ),
        blueCombinedButtonBlinkinPulseWidth: get(
          blueCombinedButtonBlinkinPulseWidthAtom
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
