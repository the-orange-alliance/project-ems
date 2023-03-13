import { isMatchKey, MatchKey } from '../Match.js';
import { isArray, isNonNullObject, isNumber } from '../types.js';

export interface PrestartStatus {
  state: PrestartState,
  hardware: HardwareInfo[],
  matchKey: MatchKey
}

export type AvaliableHardware = "PLC" | "Driverstation" | "Access Point" | "Field Switch" | string;

export interface HardwareInfo {
  name: AvaliableHardware
  state: PrestartState,
  lastLog: string
}

export enum PrestartState {
  NotReady,
  Prestarting,
  Success,
  Fail
}


export const isPrestartStatus = (obj: unknown): obj is PrestartStatus =>
  isNonNullObject(obj) &&
  isMatchKey(obj.matchKey) &&
  isArray(obj.hardware) &&
  isNumber(obj.state);
