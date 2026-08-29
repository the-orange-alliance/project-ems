import { localClient } from './http-clients.js';

export const socketApi = {
  create: {
    client: (data: unknown): Promise<void | null> =>
      localClient.post<void>('/socketClients/connect', { body: data })
  },
  update: {
    client: (uuid: string, data: unknown): Promise<void | null> =>
      localClient.post<void>(`/socketClients/update/${uuid}`, { body: data })
  },
  delete: {
    client: (uuid: string): Promise<void | null> =>
      localClient.delete<void>(`/socketClients/remove/${uuid}`)
  }
};
