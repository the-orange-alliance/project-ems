import { apiFetcher, clientFetcher } from '@toa-lib/client';
import {
  Event,
  eventZod,
  FMSSettings,
  isFMSSettingsArray
} from '@toa-lib/models';
import { atom, selector } from 'recoil';
import { setApiStorage } from 'src/api/use-storage-data';
import { AppFlags, defaultFlags } from './AppFlags';

/**
 * @section FRC FMS STATE
 * Recoil state management for frc-fms
 */
// Not public
const socketClients = selector<any[]>({
  key: 'socketClients',
  get: async () => {
    try {
      return await clientFetcher<any[]>(
        'socketClients',
        'GET',
        undefined // , // TODO: Add typeguard
        // isFMSSettingsArray
      );
    } catch (e) {
      console.log(e);
      return [];
    }
  }
});

// TODO: Make a model for this
export const socketClientsAtom = atom<any[]>({
  key: 'allSocketClients',
  default: socketClients
});

/**
 * @section Socket Client States
 * Recoil state management for frc-fms
 */
// Not public
const frcFmsSelector = selector<FMSSettings[]>({
  key: 'fms',
  get: async () => {
    try {
      return await clientFetcher<FMSSettings[]>(
        'frc/fms/advancedNetworkingConfig',
        'GET',
        undefined,
        isFMSSettingsArray
      );
    } catch (e) {
      console.log(e);
      return [];
    }
  }
});

export const allFrcFmsAtom = atom<FMSSettings[]>({
  key: 'allFrcFmsAtom',
  default: frcFmsSelector
});

/**
 * @section NETWORK STATE
 * Recoil state management for backend network interactions
 */

/**
 * @section FLAGS STATE
 * Recoil state management for application flags
 */
export const appFlagsAtom = atom<AppFlags>({
  key: 'appFlagsAtom_UNSTABLE',
  default: selector<AppFlags>({
    key: 'appFlagsAtomSelector_UNSTABLE',
    get: async (): Promise<AppFlags> => {
      try {
        return await clientFetcher('storage/flags.json', 'GET');
      } catch (e) {
        // If the above fails, try creating the file and returning default flags.
        setApiStorage('flags.json', defaultFlags);
        return defaultFlags;
      }
    }
  })
});

/**
 * @section EVENT STATE
 * Recoil state management for various events
 */
// Private selector that shouldn't be globally available
const eventsSelector = selector<Event[]>({
  key: 'eventsSelector',
  get: async () => {
    try {
      return await apiFetcher(
        'event',
        'GET',
        undefined,
        eventZod.array().parse
      );
    } catch (e) {
      console.log(e);
      return [];
    }
  }
});

export const eventsAtom = atom<Event[]>({
  key: 'eventsAtom',
  default: eventsSelector
});
