import { clientFetcher } from '@toa-lib/client';
import { FMSSettings } from '@toa-lib/models';

export const postFrcFmsSettings = (settings: FMSSettings): Promise<void> =>
  clientFetcher(`frc/fms/advancedNetworkingConfig`, 'POST', settings);
