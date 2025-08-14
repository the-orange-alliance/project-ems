import { ApiError } from '@toa-lib/models';
import z, { ZodRawShape } from 'zod';
import logger from './Logger.js';

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

export const InvalidDataError: ApiError = {
  code: 400,
  message: 'The body sent does not match the route parameters. Please ensure the body matches the route.'
};

export const RouteNotFound: ApiError = {
  code: 404,
  message: 'Route not found.'
};

export const SeasonFunctionsMissing: ApiError = {
  code: 500,
  message: 'Internal server error. Could not find season functions.'
};

export const GenericInternalServerError: ApiError = {
  code: 500,
  message: 'Internal server error.'
};

export const InternalServerError = (message?: unknown): ApiError => {
  logger.error(
    `Internal server error: ${message}\n${message instanceof Error ? message.stack : ''}`
  );

  return ({
    code: 500,
    message: `Internal server error. ${message ?? ''}`
  });
}

type ApiErrors = typeof InvalidQueryError | typeof EmptyBodyError | typeof BodyNotValidError | typeof UnauthorizedError | typeof AuthenticationError | typeof AuthenticationNotLocalError | typeof AuthenticationInvalidError | typeof DataNotFoundError | typeof InvalidDataError | typeof RouteNotFound | typeof SeasonFunctionsMissing | typeof GenericInternalServerError;

export const ApiErrorZod = z.object({
  code: z.number(),
  message: z.string()
});

const apiErrorToSchema = (error: ApiErrors) =>
  z.object({
    code: z.literal(error.code),
    message: z.literal(error.message)
  });


export function errorableSchema<T extends z.ZodTypeAny, U extends ApiErrors = typeof GenericInternalServerError>(
  successSchema: T,
  ...errors: U[]
):
  // Return type is an intersection of the success schema and each error schema
  ({
    200: T;
    500: ApiError;
  } &
  {
    [K in U as `${K['code']}`]: ({
      code: K['code'];
      message: K['message'];
    });
  }) {
  const errorSchemas = errors.reduce<Record<number, z.ZodTypeAny>>((acc, err) => {
    acc[err.code] = apiErrorToSchema(err);
    return acc;
  }, {});
  const combined = {
    200: successSchema,
    ...errorSchemas
  } as any;

  if (combined[500] === undefined) {
    combined[500] = ApiErrorZod;
  } else {
    combined[500] = z.union([
      combined[500], ApiErrorZod, z.any()
    ]);
  }
  return combined;
}