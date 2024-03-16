import { z } from 'zod';

export const userZod = z.object({
  id: z.number(),
  username: z.string(),
  permissions: z.string()
});

export const userLoginZod = z.object({
  username: z.string(),
  password: z.string()
});

export const userLoginResponseZod = userZod.extend({
  token: z.string()
});

export type User = z.infer<typeof userZod>;
export type UserLogin = z.infer<typeof userLoginZod>;
export type UserLoginResponse = z.infer<typeof userLoginResponseZod>;
