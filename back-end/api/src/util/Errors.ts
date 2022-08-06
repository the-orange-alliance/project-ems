import { ApiError } from '@toa-lib/models';

export const InvalidQueryError: ApiError = {
  code: 400,
  message: 'Invalid query parameters.'
};

export const UnauthorizedError: ApiError = {
  code: 401,
  message: 'Please authenticate before using this route.'
};

export const AuthenticationError: ApiError = {
  code: 500,
  message: 'Internal server error while trying to authenticate.'
};

export const AuthenticationInvalidError: ApiError = {
  code: 401,
  message:
    'Invalid credentials. Please use a valid username/password combination.'
};
