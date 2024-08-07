import { clientFetcher } from '@toa-lib/client';
import { FMSSettings, isFMSSettingsArray } from '@toa-lib/models';
import { atom, selector } from 'recoil';
import { setApiStorage } from 'src/api/use-storage-data';
import { AppFlags, defaultFlags } from './app-flags';

/**
 * @section Socket Client States
 * Recoil state management for frc-fms
 */
export const socketClientsSelector = selector<any[]>({
  key: 'socketClients',
  get: async ({get}) => {
    // This is stupid, but is a surefire way to force the atom to refetch each time when the array is empty
    // This way, to force a refetch, you can just set the atom to an empty array.  Since we're not using any
    // kind of async fetch library, like react-query, this is probably the best, but dumbest way to do it.
    // this also allows us to use the atom as a cache when updating locally.
    const current: any[] = await get(socketClientsAtom);
    // If we have data, return it
    if (current && current.length > 0) {
      return current;
    }
    // Otherwise, fetch it
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
  },
  set: ({ set }, newValue) => {
    set(socketClientsAtom, newValue);
  }
});

// TODO: Make a model for this
const socketClientsAtom = atom<any[]>({
  key: 'allSocketClients',
  default: []
});

/** FRC FMS STATE
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
