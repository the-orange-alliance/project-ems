import { isNonNullObject, isNumber, isString } from './types';

export interface User {
  id: number;
  username: string;
  permissions: string;
  token: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export const isUser = (obj: unknown): obj is User =>
  isNonNullObject(obj) &&
  isNumber(obj.id) &&
  isString(obj.username) &&
  isString(obj.permissions) &&
  isString(obj.token);

export const isUserLogin = (obj: unknown): obj is UserLogin =>
  isNonNullObject(obj) && isString(obj.username) && isString(obj.password);
