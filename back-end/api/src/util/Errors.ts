import { ApiError } from '@toa-lib/models';

export const InvalidQueryError: ApiError = {
  code: 400,
  message: 'Invalid query parameters.'
};

export const EmptyBodyError: ApiError = {
  code: 400,
  message: 'Request body is empty.'
};

export const BodyNotValidError: ApiError = {
  code: 400,
  message: 'Request body is not valid. Make sure required fields are present.'
};

export const UnauthorizedError: ApiError = {
  code: 401,
  message: 'Please authenticate before using this route.'
};

export const AuthenticationError: ApiError = {
  code: 500,
  message: 'Internal server error while trying to authenticate.'
};

export const AuthenticationNotLocalError: ApiError = {
  code: 401,
  message: 'Your connection is not local for this authentication request.'
};

export const AuthenticationInvalidError: ApiError = {
  code: 401,
  message:
    'Invalid credentials. Please use a valid username/password combination.'
};

export const DataNotFoundError: ApiError = {
  code: 500,
  message: 'Data requested was not found'
};

export const RouteNotFound: ApiError = {
  code: 404,
  message: 'Route not found.'
};

export const SeasonFunctionsMissing: ApiError = {
  code: 500,
  message: 'Internal server error. Could not find season functions.'
};
