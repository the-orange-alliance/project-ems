import { FMSSettings } from '@toa-lib/models';
import { localClient } from './http-clients.js';

export const fmsApi = {
  create: {
    frcFmsSettings: async (settings: FMSSettings): Promise<void> => {
      await localClient.post<void>('/frc/fms/advancedNetworkingConfig', {
        body: settings
      });
    }
  }
};
