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

// Elevated-action password gate (destructive Admin / tournament-delete actions)
export const elevatedAuthZod = z.object({ password: z.string() });
export const elevatedAuthResponseZod = z.object({ ok: z.boolean() });
export type ElevatedAuth = z.infer<typeof elevatedAuthZod>;
export type ElevatedAuthResponse = z.infer<typeof elevatedAuthResponseZod>;
