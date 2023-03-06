import { isMatchKey, MatchKey } from '../Match.js';
import { isBoolean, isNonNullObject } from '../types.js';

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
  isBoolean(obj.prestartSuccess) &&
  isBoolean(obj.apReady) &&
  isBoolean(obj.dsReady) &&
  isBoolean(obj.switchReady);
