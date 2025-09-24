import { FeedingTheFutureFCS } from '@toa-lib/models';
import { atom, RecoilValueReadOnly, selector } from 'recoil';
import { localStorageEffect } from 'src/stores/recoil-effects';

export const goalLedLengthAtom = atom<number>({
  key: 'ftf.goalLedLength',
  default: FeedingTheFutureFCS.defaultFieldOptions.goalLedLength,
  effects: [localStorageEffect('ftf.goalLedLength')]
});

export const rampLedLengthAtom = atom<number>({
  key: 'ftf.rampLedLength',
  default: FeedingTheFutureFCS.defaultFieldOptions.rampLedLength,
  effects: [localStorageEffect('ftf.rampLedLength')]
});

export const allClearColorAtom = atom<string>({
  key: 'ftf.allClearColor',
  default: FeedingTheFutureFCS.defaultFieldOptions.allClearColor,
  effects: [localStorageEffect('ftf.allClearColor')]
});

export const prepareFieldColorAtom = atom<string>({
  key: 'ftf.prepareFieldColor',
  default: FeedingTheFutureFCS.defaultFieldOptions.prepareFieldColor,
  effects: [localStorageEffect('ftf.prepareFieldColor')]
});

export const fieldFaultColorAtom = atom<string>({
  key: 'ftf.fieldFaultColor',
  default: FeedingTheFutureFCS.defaultFieldOptions.fieldFaultColor,
  effects: [localStorageEffect('ftf.fieldFaultColor')]
});

export const matchEndRedNexusGoalColorAtom = atom<string>({
  key: 'ftf.matchEndRedNexusGoalColor',
  default: FeedingTheFutureFCS.defaultFieldOptions.matchEndRedNexusGoalColor,
  effects: [localStorageEffect('ftf.matchEndRedNexusGoalColor')]
});

export const matchEndBlueNexusGoalColorAtom = atom<string>({
  key: 'ftf.matchEndBlueNexusGoalColor',
  default: FeedingTheFutureFCS.defaultFieldOptions.matchEndBlueNexusGoalColor,
  effects: [localStorageEffect('ftf.matchEndBlueNexusGoalColor')]
});

export const redWledWebSocketAddressAtom = atom<string>({
  key: 'ftf.redWledWebSocketAddress',
  default: FeedingTheFutureFCS.defaultFieldOptions.redWledWebSocketAddress,
  effects: [localStorageEffect('ftf.redWledWebSocketAddress')]
});

export const blueWledWebSocketAddressAtom = atom<string>({
  key: 'ftf.blueWledWebSocketAddress',
  default: FeedingTheFutureFCS.defaultFieldOptions.blueWledWebSocketAddress,
  effects: [localStorageEffect('ftf.blueWledWebSocketAddress')]
});

export const centerWledWebSocketAddressAtom = atom<string>({
  key: 'ftf.centerWledWebSocketAddress',
  default: FeedingTheFutureFCS.defaultFieldOptions.centerWledWebSocketAddress,
  effects: [localStorageEffect('ftf.centerWledWebSocketAddress')]
});

export const foodProductionMotorSetpointAtom = atom<number>({
  key: 'ftf.foodProductionMotorSetpoint',
  default: FeedingTheFutureFCS.defaultFieldOptions.foodProductionMotorSetpoint,
  effects: [localStorageEffect('ftf.foodProductionMotorSetpoint')]
});

export const foodProductionMotorDurationMsAtom = atom<number>({
  key: 'ftf.foodProductionMotorDurationMs',
  default:
    FeedingTheFutureFCS.defaultFieldOptions.foodProductionMotorDurationMs,
  effects: [localStorageEffect('ftf.foodProductionMotorDurationMs')]
});

export const foodResetMotorSetpointAtom = atom<number>({
  key: 'ftf.foodResetMotorSetpoint',
  default: FeedingTheFutureFCS.defaultFieldOptions.foodResetMotorSetpoint,
  effects: [localStorageEffect('ftf.foodResetMotorSetpoint')]
});

export const foodResetMotorDurationMsAtom = atom<number>({
  key: 'ftf.foodResetMotorDurationMs',
  default: FeedingTheFutureFCS.defaultFieldOptions.foodResetMotorDurationMs,
  effects: [localStorageEffect('ftf.foodResetMotorDurationMs')]
});

export const foodProductionDelayMsAtom = atom<number>({
  key: 'ftf.foodProductionDelayMs',
  default: FeedingTheFutureFCS.defaultFieldOptions.foodProductionDelayMs,
  effects: [localStorageEffect('ftf.foodProductionDelayMs')]
});

export const rampBalancedHysteresisWindowMsAtom = atom<number>({
  key: 'ftf.rampBalancedHysteresisWindowMs',
  default:
    FeedingTheFutureFCS.defaultFieldOptions.rampBalancedHysteresisWindowMs,
  effects: [localStorageEffect('ftf.rampBalancedHysteresisWindowMs')]
});

export const rampUnbalancedHysteresisWindowMsAtom = atom<number>({
  key: 'ftf.rampUnbalancedHysteresisWindowMs',
  default:
    FeedingTheFutureFCS.defaultFieldOptions.rampUnbalancedHysteresisWindowMs,
  effects: [localStorageEffect('ftf.rampUnbalancedHysteresisWindowMs')]
});

export const goalEmptyColorAtom = atom<string>({
  key: 'ftf.goalEmptyColor',
  default: FeedingTheFutureFCS.defaultFieldOptions.goalEmptyColor,
  effects: [localStorageEffect('ftf.goalEmptyColor')]
});

export const goalBlueOnlyColorAtom = atom<string>({
  key: 'ftf.goalBlueOnlyColor',
  default: FeedingTheFutureFCS.defaultFieldOptions.goalBlueOnlyColor,
  effects: [localStorageEffect('ftf.goalBlueOnlyColor')]
});

export const goalGreenOnlyColorAtom = atom<string>({
  key: 'ftf.goalGreenOnlyColor',
  default: FeedingTheFutureFCS.defaultFieldOptions.goalGreenOnlyColor,
  effects: [localStorageEffect('ftf.goalGreenOnlyColor')]
});

export const goalFullColorAtom = atom<string>({
  key: 'ftf.goalFullColor',
  default: FeedingTheFutureFCS.defaultFieldOptions.goalFullColor,
  effects: [localStorageEffect('ftf.goalFullColor')]
});

export const goalFullSecondaryColorAtom = atom<string>({
  key: 'ftf.goalFullSecondaryColor',
  default: FeedingTheFutureFCS.defaultFieldOptions.goalFullSecondaryColor,
  effects: [localStorageEffect('ftf.goalFullSecondaryColor')]
});

export const rampBalancedColorAtom = atom<string>({
  key: 'ftf.rampBalancedColor',
  default: FeedingTheFutureFCS.defaultFieldOptions.rampBalancedColor,
  effects: [localStorageEffect('ftf.rampBalancedColor')]
});

export const rampUnbalancedColorAtom = atom<string>({
  key: 'ftf.rampUnbalancedColor',
  default: FeedingTheFutureFCS.defaultFieldOptions.rampUnbalancedColor,
  effects: [localStorageEffect('ftf.rampUnbalancedColor')]
});

export const fieldOptionsSelector: RecoilValueReadOnly<FeedingTheFutureFCS.FieldOptions> =
  selector({
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
        redWledWebSocketAddress: get(redWledWebSocketAddressAtom),
        blueWledWebSocketAddress: get(blueWledWebSocketAddressAtom),
        centerWledWebSocketAddress: get(centerWledWebSocketAddressAtom),
        foodProductionMotorSetpoint: get(foodProductionMotorSetpointAtom),
        foodProductionMotorDurationMs: get(foodProductionMotorDurationMsAtom),
        foodResetMotorSetpoint: get(foodResetMotorSetpointAtom),
        foodResetMotorDurationMs: get(foodResetMotorDurationMsAtom),
        foodProductionDelayMs: get(foodProductionDelayMsAtom),
        rampBalancedHysteresisWindowMs: get(rampBalancedHysteresisWindowMsAtom),
        rampUnbalancedHysteresisWindowMs: get(
          rampUnbalancedHysteresisWindowMsAtom
        ),
        goalEmptyColor: get(goalEmptyColorAtom),
        goalBlueOnlyColor: get(goalBlueOnlyColorAtom),
        goalGreenOnlyColor: get(goalGreenOnlyColorAtom),
        goalFullColor: get(goalFullColorAtom),
        goalFullSecondaryColor: get(goalFullSecondaryColorAtom),
        rampBalancedColor: get(rampBalancedColorAtom),
        rampUnbalancedColor: get(rampUnbalancedColorAtom)
      };
    }
  });
