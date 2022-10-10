import { isNonNullObject, isString } from './types.js';

export interface ApiStoragePost {
  file: string;
  data: unknown;
}

export interface ApiStoragePatch {
  file: string;
  key: string;
  data: unknown;
}

export const isAppStoragePost = (obj: unknown): obj is ApiStoragePost =>
  isNonNullObject(obj) && isString(obj.file);

export const isAppStoragePatch = (obj: unknown): obj is ApiStoragePatch =>
  isNonNullObject(obj) && isString(obj.file) && isString(obj.key);
