import { post } from '@toa-lib/client';

export const login = async (username: string, password: string) => {
  const user = await post('auth/login', {
    username,
    password
  });
  console.log(user);
};
