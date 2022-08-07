import { post } from '@toa-lib/client';
import { ApiError, isUser, User } from '@toa-lib/models';

export const login = async (
  username: string,
  password: string
): Promise<ApiError | User> => {
  const res = await post(`auth/login`, {
    username,
    password
  });
  const data = await res.json();
  if (isUser(data)) {
    return data as User;
  } else {
    return data as ApiError;
  }
};
