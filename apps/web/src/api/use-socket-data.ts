import { clientFetcher } from '@toa-lib/client';

export const deleteSocketClient = (uuid: string): Promise<void> =>
  clientFetcher(`socketClients/remove/${uuid}`, 'DELETE');

export const updateSocketClient = (uuid: string, data: any): Promise<void> =>
  clientFetcher(`socketClients/update/${uuid}`, 'POST', data);

export const connectSocketClient = (data: any): Promise<void> =>
  clientFetcher(`socketClients/connect`, 'POST', data);
