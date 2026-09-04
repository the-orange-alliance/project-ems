import { elevatedAuthResponseZod } from '@toa-lib/models';
import { localClient } from './http-clients.js';

export const elevatedAuthApi = {
  create: {
    verify: async (password: string): Promise<boolean> => {
      const payload = await localClient.post<unknown>('/auth/elevated', {
        body: { password }
      });
      return elevatedAuthResponseZod.parse(payload).ok;
    }
  }
};
