import { isMatchKey, MatchKey } from '../Match.js';
import { isNonNullObject, isNumber } from '../types.js';

export interface PrestartStatus {
  prestartComplete: boolean;
  apReady: boolean;
  dsReady: boolean;
  switchReady: boolean;
  error?: string;
  matchKey: MatchKey;
}

export const isPrestartStatus = (obj: unknown): obj is PrestartStatus =>
  isNonNullObject(obj) &&
  isMatchKey(obj.matchKey) &&
  isNumber(obj.prestartSuccess) &&
  isNumber(obj.apReady) &&
  isNumber(obj.dsReady) &&
  isNumber(obj.switchReady);
