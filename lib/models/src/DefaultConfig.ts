import { User } from './User.js';

// Default API Provider constants
export const DEFAULT_API_HOST = 'http://localhost';
export const DEFAULT_API_PORT = 8080;

// Default Socket Provider constants
export const DEFAULT_SOCKET_HOST = 'localhost';
export const DEFAULT_SOCKET_PORT = 8081;

// Default User constants
export const DEFAULT_ADMIN_USERNAME = 'localhost';
export const DEFAULT_ADMIN_PASSWORD = 'admin';
export const DEFAULT_ADMIN_USER: User = {
  id: 0,
  username: 'localhost',
  permissions: '*'
};
