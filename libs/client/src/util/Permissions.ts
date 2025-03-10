import { User } from '@toa-lib/models';

export default function (user: User | null, permKey: string): boolean {
  if (!user || !user.permissions) return false;

  if (user.permissions === '*') return true;

  if (user.permissions.indexOf(permKey) > -1) return true;

  return false;
}
