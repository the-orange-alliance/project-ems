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

export const redWledWebSocketAddressAtom = atom<string>({
  key: 'ftf.redWledWebSocketAddress',
  default: defaultFieldOptions.redWledWebSocketAddress,
  effects: [localStorageEffect('ftf.redWledWebSocketAddress')]
});

export const blueWledWebSocketAddressAtom = atom<string>({
  key: 'ftf.blueWledWebSocketAddress',
  default: defaultFieldOptions.blueWledWebSocketAddress,
  effects: [localStorageEffect('ftf.blueWledWebSocketAddress')]
});

export const centerWledWebSocketAddressAtom = atom<string>({
  key: 'ftf.centerWledWebSocketAddress',
  default: defaultFieldOptions.centerWledWebSocketAddress,
  effects: [localStorageEffect('ftf.centerWledWebSocketAddress')]
});

export const foodProductionMotorSetpointAtom = atom<number>({
  key: 'ftf.foodProductionMotorSetpoint',
  default: defaultFieldOptions.foodProductionMotorSetpoint,
  effects: [localStorageEffect('ftf.foodProductionMotorSetpoint')]
});

export const foodProductionMotorDurationMsAtom = atom<number>({
  key: 'ftf.foodProductionMotorDurationMs',
  default: defaultFieldOptions.foodProductionMotorDurationMs,
  effects: [localStorageEffect('ftf.foodProductionMotorDurationMs')]
});

export const foodResetMotorSetpointAtom = atom<number>({
  key: 'ftf.foodResetMotorSetpoint',
  default: defaultFieldOptions.foodResetMotorSetpoint,
  effects: [localStorageEffect('ftf.foodResetMotorSetpoint')]
});

export const foodProductionDelayMsAtom = atom<number>({
  key: 'ftf.foodProductionDelayMs',
  default: defaultFieldOptions.foodProductionDelayMs,
  effects: [localStorageEffect('ftf.foodProductionDelayMs')]
});

export const rampHysteresisWindowMsAtom = atom<number>({
  key: 'ftf.rampHysteresisWindowMs',
  default: defaultFieldOptions.rampHysteresisWindowMs,
  effects: [localStorageEffect('ftf.rampHysteresisWindowMs')]
});

export const goalEmptyColorAtom = atom<string>({
  key: 'ftf.goalEmptyColor',
  default: defaultFieldOptions.goalEmptyColor,
  effects: [localStorageEffect('ftf.goalEmptyColor')]
});

export const goalBlueOnlyColorAtom = atom<string>({
  key: 'ftf.goalBlueOnlyColor',
  default: defaultFieldOptions.goalBlueOnlyColor,
  effects: [localStorageEffect('ftf.goalBlueOnlyColor')]
});

export const goalGreenOnlyColorAtom = atom<string>({
  key: 'ftf.goalGreenOnlyColor',
  default: defaultFieldOptions.goalGreenOnlyColor,
  effects: [localStorageEffect('ftf.goalGreenOnlyColor')]
});

export const goalFullColorAtom = atom<string>({
  key: 'ftf.goalFullColor',
  default: defaultFieldOptions.goalFullColor,
  effects: [localStorageEffect('ftf.goalFullColor')]
});

export const rampBalancedColorAtom = atom<string>({
  key: 'ftf.rampBalancedColor',
  default: defaultFieldOptions.rampBalancedColor,
  effects: [localStorageEffect('ftf.rampBalancedColor')]
});

export const rampUnbalancedColorAtom = atom<string>({
  key: 'ftf.rampUnbalancedColor',
  default: defaultFieldOptions.rampUnbalancedColor,
  effects: [localStorageEffect('ftf.rampUnbalancedColor')]
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
        matchEndRampColor: get(matchEndRampColorAtom),
        redWledWebSocketAddress: get(redWledWebSocketAddressAtom),
        blueWledWebSocketAddress: get(blueWledWebSocketAddressAtom),
        centerWledWebSocketAddress: get(centerWledWebSocketAddressAtom),
        foodProductionMotorSetpoint: get(foodProductionMotorSetpointAtom),
        foodProductionMotorDurationMs: get(foodProductionMotorDurationMsAtom),
        foodResetMotorSetpoint: get(foodResetMotorSetpointAtom),
        foodProductionDelayMs: get(foodProductionDelayMsAtom),
        rampHysteresisWindowMs: get(rampHysteresisWindowMsAtom),
        goalEmptyColor: get(goalEmptyColorAtom),
        goalBlueOnlyColor: get(goalBlueOnlyColorAtom),
        goalGreenOnlyColor: get(goalGreenOnlyColorAtom),
        goalFullColor: get(goalFullColorAtom),
        rampBalancedColor: get(rampBalancedColorAtom),
        rampUnbalancedColor: get(rampUnbalancedColorAtom)
      };
    }
  }
);
