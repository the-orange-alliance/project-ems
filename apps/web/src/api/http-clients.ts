import { HttpClient } from '@toa-lib/client';
import { EMSApiErrorSchema } from './http-errors.js';

export const localClient = new HttpClient({
  baseUrl: `${window.location.protocol}//${window.location.hostname}:8080`,
  getErrorMessage: (error) =>
    error instanceof Error
      ? `${error.name} ${error.message}`
      : `Status ${error?.code}: ${error?.message}`,
  errorSchema: EMSApiErrorSchema
});

export const remoteClient = new HttpClient({
  baseUrl: `${window.location.protocol}//${window.location.hostname}:8080`,
  getErrorMessage: (error) =>
    error instanceof Error
      ? `${error.name} ${error.message}`
      : `Status ${error?.code}: ${error?.message}`,
  errorSchema: EMSApiErrorSchema
});
