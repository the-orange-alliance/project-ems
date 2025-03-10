import { atom, RecoilValueReadOnly, selector } from 'recoil';
import { localStorageEffect } from 'src/stores/recoil-effects';
import { HydrogenHorizonsFCS } from '@toa-lib/models';

export const redServoHoldPositionPulseWidthAtom = atom({
  key: 'fgc2023_redServoHoldPositionPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions.redServoHoldPositionPulseWidth,
  effects: [localStorageEffect('fgc2023_redServoHoldPositionPulseWidth')]
});

export const redServoReleasedPositionPulseWidthAtom = atom({
  key: 'fgc2023_redServoReleasedPositionPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions.redServoReleasedPositionPulseWidth,
  effects: [localStorageEffect('fgc2023_redServoReleasedPositionPulseWidth')]
});

export const blueServoHoldPositionPulseWidthAtom = atom({
  key: 'fgc2023_blueServoHoldPositionPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions.blueServoHoldPositionPulseWidth,
  effects: [localStorageEffect('fgc2023_blueServoHoldPositionPulseWidth')]
});

export const blueServoReleasedPositionPulseWidthAtom = atom({
  key: 'fgc2023_blueServoReleasedPositionPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions.blueServoReleasedPositionPulseWidth,
  effects: [localStorageEffect('fgc2023_blueServoReleasedPositionPulseWidth')]
});

export const prepareFieldBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_prepareFieldBlinkinPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions.prepareFieldBlinkinPulseWidth,
  effects: [localStorageEffect('fgc2023_prepareFieldBlinkinPulseWidth')]
});

export const fieldFaultBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_fieldFaultBlinkinPulseWidth',
  default: HydrogenHorizonsFCS.defaultFieldOptions.fieldFaultBlinkinPulseWidth,
  effects: [localStorageEffect('fgc2023_fieldFaultBlinkinPulseWidth')]
});

export const solidRedBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_solidRedBlinkinPulseWidth',
  default: HydrogenHorizonsFCS.defaultFieldOptions.solidRedBlinkinPulseWidth,
  effects: [localStorageEffect('fgc2023_solidRedBlinkinPulseWidth')]
});

export const solidBlueBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_solidBlueBlinkinPulseWidth',
  default: HydrogenHorizonsFCS.defaultFieldOptions.solidBlueBlinkinPulseWidth,
  effects: [localStorageEffect('fgc2023_solidBlueBlinkinPulseWidth')]
});

export const allClearBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_allClearBlinkinPulseWidth',
  default: HydrogenHorizonsFCS.defaultFieldOptions.allClearBlinkinPulseWidth,
  effects: [localStorageEffect('fgc2023_allClearBlinkinPulseWidth')]
});

export const redEndgameOxygenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_redEndgameOxygenGoalBlinkinPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions
      .redEndgameOxygenGoalBlinkinPulseWidth,
  effects: [localStorageEffect('fgc2023_redEndgameOxygenGoalBlinkinPulseWidth')]
});

export const blueEndgameOxygenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_blueEndgameOxygenGoalBlinkinPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions
      .blueEndgameOxygenGoalBlinkinPulseWidth,
  effects: [
    localStorageEffect('fgc2023_blueEndgameOxygenGoalBlinkinPulseWidth')
  ]
});

export const redEndgameHydrogenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_redEndgameHydrogenGoalBlinkinPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions
      .redEndgameHydrogenGoalBlinkinPulseWidth,
  effects: [
    localStorageEffect('fgc2023_redEndgameHydrogenGoalBlinkinPulseWidth')
  ]
});

export const blueEndgameHydrogenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_blueEndgameHydrogenGoalBlinkinPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions
      .blueEndgameHydrogenGoalBlinkinPulseWidth,
  effects: [
    localStorageEffect('fgc2023_blueEndgameHydrogenGoalBlinkinPulseWidth')
  ]
});

export const redEndgameButtonBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_redEndgameButtonBlinkinPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions.redEndgameButtonBlinkinPulseWidth,
  effects: [localStorageEffect('fgc2023_redEndgameButtonBlinkinPulseWidth')]
});

export const blueEndgameButtonBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_blueEndgameButtonBlinkinPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions.blueEndgameButtonBlinkinPulseWidth,
  effects: [localStorageEffect('fgc2023_blueEndgameButtonBlinkinPulseWidth')]
});

export const redCombinedOxygenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_redCombinedOxygenGoalBlinkinPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions
      .redCombinedOxygenGoalBlinkinPulseWidth,
  effects: [
    localStorageEffect('fgc2023_redCombinedOxygenGoalBlinkinPulseWidth')
  ]
});

export const blueCombinedOxygenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_blueCombinedOxygenGoalBlinkinPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions
      .blueCombinedOxygenGoalBlinkinPulseWidth,
  effects: [
    localStorageEffect('fgc2023_blueCombinedOxygenGoalBlinkinPulseWidth')
  ]
});

export const redCombinedHydrogenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_redCombinedHydrogenGoalBlinkinPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions
      .redCombinedHydrogenGoalBlinkinPulseWidth,
  effects: [
    localStorageEffect('fgc2023_redCombinedHydrogenGoalBlinkinPulseWidth')
  ]
});

export const blueCombinedHydrogenGoalBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_blueCombinedHydrogenGoalBlinkinPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions
      .blueCombinedHydrogenGoalBlinkinPulseWidth,
  effects: [
    localStorageEffect('fgc2023_blueCombinedHydrogenGoalBlinkinPulseWidth')
  ]
});

export const redCombinedButtonBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_redCombinedButtonBlinkinPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions.redCombinedButtonBlinkinPulseWidth,
  effects: [localStorageEffect('fgc2023_redCombinedButtonBlinkinPulseWidth')]
});

export const blueCombinedButtonBlinkinPulseWidthAtom = atom({
  key: 'fgc2023_blueCombinedButtonBlinkinPulseWidth',
  default:
    HydrogenHorizonsFCS.defaultFieldOptions.blueCombinedButtonBlinkinPulseWidth,
  effects: [localStorageEffect('fgc2023_blueCombinedButtonBlinkinPulseWidth')]
});

export const fieldOptionsSelector: RecoilValueReadOnly<HydrogenHorizonsFCS.FieldOptions> =
  selector({
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
  });

export const fcsPacketsSelector: RecoilValueReadOnly<HydrogenHorizonsFCS.FcsPackets> =
  selector({
    key: 'fgc2023_fcsPackets',
    get: ({ get }) => {
      return HydrogenHorizonsFCS.getFcsPackets(get(fieldOptionsSelector));
    }
  });
