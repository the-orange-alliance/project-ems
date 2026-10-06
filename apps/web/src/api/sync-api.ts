import { remoteClient } from './http-clients.js';

export const syncApi = {
  import: (file: File) =>
    remoteClient.post('/sync/import', {
      body: file,
      headers: { 'Content-Type': 'application/zip' }
    }),
  export: () => remoteClient.get('/sync/export', { responseType: 'zip' })
};
