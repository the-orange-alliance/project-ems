export {
  DEFAULT_API_HOST,
  DEFAULT_API_PORT,
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USER,
  DEFAULT_ADMIN_USERNAME
} from './DefaultConfig';

export {
  User,
  UserLogin,
  UserLoginResponse,
  isUser,
  isUserLoginResponse,
  isUserArray,
  isUserLogin
} from './User';

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
