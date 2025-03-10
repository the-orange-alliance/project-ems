import { isNonNullObject, isNumber, isString } from '../types.js';

export interface WPAKey {
  wpaKey: string;
  teamKey: number;
  eventKey: string;
}

export const isWPAKey = (obj: unknown): obj is WPAKey =>
  isNonNullObject(obj) &&
  isString(obj.eventKey) &&
  isString(obj.wpaKey) &&
  isNumber(obj.teamKey);
