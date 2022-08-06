import { isNonNullObject, isNumber, isString } from './types';

export interface User {
  id: number;
  username: string;
  permissions: string;
}

export const isUser = (obj: unknown): obj is User =>
  isNonNullObject(obj) &&
  isNumber(obj.id) &&
  isString(obj.username) &&
  isString(obj.permissions);
