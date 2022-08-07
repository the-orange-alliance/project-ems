export { DEFAULT_API_HOST, DEFAULT_API_PORT } from './DefaultConfig';

export { User, UserLogin, isUser, isUserLogin } from './User';
export {
  ApiErrorResponse,
  ApiError,
  SQLError,
  isApiError,
  isSQLError
} from './ApiErrors';

export {
  TypeGuard,
  isBoolean,
  isNonNullObject,
  isNumber,
  isString
} from './types';
