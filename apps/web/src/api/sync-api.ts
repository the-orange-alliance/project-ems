import { localClient, remoteClient } from './http-clients.js';

export const syncApi = {
  import: (file: File) =>
    localClient.post('/sync/import', {
      body: file
    }),
  export: (): Promise<Blob | null> =>
    remoteClient.get<Blob | null>('/sync/export', {
      responseType: 'zip'
    })
};
