import { isArray, isNonNullObject, isNumber, isString } from './types';

export interface User {
  id: number;
  username: string;
  permissions: string;
}

export interface UserLogin {
  username: string;
  password: string;
}

export interface UserLoginResponse extends User {
  token: string;
}

export const isUser = (obj: unknown): obj is User =>
  isNonNullObject(obj) &&
  isNumber(obj.id) &&
  isString(obj.username) &&
  isString(obj.permissions);

export const isUserLoginResponse = (obj: unknown): obj is UserLoginResponse =>
  isNonNullObject(obj) &&
  isNumber(obj.id) &&
  isString(obj.username) &&
  isString(obj.permissions) &&
  isString(obj.token);

export const isUserArray = (obj: unknown): obj is User[] =>
  isArray(obj) && obj.every((o) => isUser(o));

export const isUserLogin = (obj: unknown): obj is UserLogin =>
  isNonNullObject(obj) && isString(obj.username) && isString(obj.password);
