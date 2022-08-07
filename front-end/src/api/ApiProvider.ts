import { clientFetcher } from '@toa-lib/client';
import { isUser, User } from '@toa-lib/models';

export const login = async (
  username: string,
  password: string
): Promise<User> =>
  clientFetcher(
    'auth/login',
    'POST',
    {
      username,
      password
    },
    isUser
  );
