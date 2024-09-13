import { defaultFieldOptions, FieldOptions } from '@toa-lib/models';
import { atom, RecoilValueReadOnly, selector } from 'recoil';
import { localStorageEffect } from 'src/stores/recoil-effects';

export const goalLedLengthAtom = atom<number>({
  key: 'ftf.goalLedLength',
  default: defaultFieldOptions.goalLedLength,
  effects: [localStorageEffect('ftf.goalLedLength')]
});

export const rampLedLengthAtom = atom<number>({
  key: 'ftf.rampLedLength',
  default: defaultFieldOptions.rampLedLength,
  effects: [localStorageEffect('ftf.rampLedLength')]
});

export const allClearColorAtom = atom<string>({
  key: 'ftf.allClearColor',
  default: defaultFieldOptions.allClearColor,
  effects: [localStorageEffect('ftf.allClearColor')]
});

export const prepareFieldColorAtom = atom<string>({
  key: 'ftf.prepareFieldColor',
  default: defaultFieldOptions.prepareFieldColor,
  effects: [localStorageEffect('ftf.prepareFieldColor')]
});

export const fieldFaultColorAtom = atom<string>({
  key: 'ftf.fieldFaultColor',
  default: defaultFieldOptions.fieldFaultColor,
  effects: [localStorageEffect('ftf.fieldFaultColor')]
});

export const matchEndRedNexusGoalColorAtom = atom<string>({
  key: 'ftf.matchEndRedNexusGoalColor',
  default: defaultFieldOptions.matchEndRedNexusGoalColor,
  effects: [localStorageEffect('ftf.matchEndRedNexusGoalColor')]
});

export const matchEndBlueNexusGoalColorAtom = atom<string>({
  key: 'ftf.matchEndBlueNexusGoalColor',
  default: defaultFieldOptions.matchEndBlueNexusGoalColor,
  effects: [localStorageEffect('ftf.matchEndBlueNexusGoalColor')]
});

export const matchEndRampColorAtom = atom<string>({
  key: 'ftf.matchEndRampColor',
  default: defaultFieldOptions.matchEndRampColor,
  effects: [localStorageEffect('ftf.matchEndRampColor')]
});

export const fieldOptionsSelector: RecoilValueReadOnly<FieldOptions> = selector(
  {
    key: 'ftf.fieldOptions',
    get: ({ get }) => {
      return {
        goalLedLength: get(goalLedLengthAtom),
        rampLedLength: get(rampLedLengthAtom),
        allClearColor: get(allClearColorAtom),
        prepareFieldColor: get(prepareFieldColorAtom),
        fieldFaultColor: get(fieldFaultColorAtom),
        matchEndRedNexusGoalColor: get(matchEndRedNexusGoalColorAtom),
        matchEndBlueNexusGoalColor: get(matchEndBlueNexusGoalColorAtom),
        matchEndRampColor: get(matchEndRampColorAtom)
      };
    }
  }
);
