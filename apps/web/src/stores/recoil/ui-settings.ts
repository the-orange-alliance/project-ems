import { User, Team, SyncPlatform } from '@toa-lib/models';
import { atom, selector } from 'recoil';
import {
  localStorageEffect,
  localStorageQueryParamDefaultEffect
} from '../recoil-effects.js';
import { clientFetcher } from '@toa-lib/client';
import { setApiStorage } from 'src/api/use-storage-data.js';
import { AppFlags, defaultFlags } from '../app-flags.js';

/**
 * @section UI SETTINGS STATE
 * Recoil state management for UI settings
 */
export const darkModeAtom = atom<boolean>({
  key: 'ui.darkModeAtom',
  default: false,
  effects: [localStorageEffect('darkMode')]
});
export const userAtom = atom<User | null>({
  key: 'ui.userAtom',
  default: { id: 0, username: 'Bypassed', permissions: '*' },
  effects: [localStorageEffect('currentUser')]
});
export const teamIdentifierAtom = atom<keyof Team>({
  key: 'ui.teamIdentifierAtom',
  default: 'teamKey',
  effects: [localStorageEffect('teamIdentifier')]
});
export const followerModeEnabledAtom = atom<boolean>({
  key: 'ui.followerModeEnabledAtom',
  default: false,
  effects: [localStorageEffect('followerMode')]
});
export const leaderApiHostAtom = atom<string>({
  key: 'ui.leaderApiHostAtom',
  default: '',
  effects: [localStorageEffect('leaderApiHost')]
});
export const syncPlatformAtom = atom<SyncPlatform>({
  key: 'ui.syncPlatform',
  default: SyncPlatform.DISABLED,
  effects: [localStorageEffect('syncPlatform')]
});
export const syncApiKeyAtom = atom<string>({
  key: 'ui.syncApiKey',
  default: '',
  effects: [localStorageEffect('syncApiKey')]
});
export const scorekeeperAudioEnabledAtom = atom<boolean>({
  key: 'ui.scorekeeperAudioEnabledAtom',
  default: false,
  effects: [localStorageEffect('syncApiKey')]
});
export const monitorAddressesAtom = atom<string[]>({
  key: 'ui.monitorAddressesAtom',
  default: [],
  effects: [localStorageEffect('monitorAddresses')]
});
/**
 * @section UI STATE
 * Recoil state management for global UI interactions
 */
export const snackbarOpenAtom = atom<boolean>({
  key: 'ui.snackbarOpenAtom',
  default: false
});
export const snackbarMessageAtom = atom<string>({
  key: 'ui.snackbarMessageAtom',
  default: ''
});
export const snackbarUseShowAtom = atom<boolean>({
  key: 'ui.snackbarUseShowAtom',
  default: false
});
export const snackbarErrorAtom = atom<string>({
  key: 'ui.snackbarErrorAtom',
  default: ''
});
export const matchDialogOpenAtom = atom<boolean>({
  key: 'ui.matchDialogOpenAtom',
  default: false
});
export const appbarConfigAtom = atom<{
  title?: string;
  titleLink?: string;
  showSettings?: boolean;
  showFullscreen?: boolean;
}>({
  key: 'ui.appbarConfigAtom',
  default: { title: 'Event Management System', showSettings: false }
});

/**
 * @section AUDIENCE DISPLAY STATE
 * Recoil state management for audience display
 */
export const displayIdAtom = atom({
  key: 'displayIDAtom',
  default: 0
});

export const displayChromaKeyAtom = atom({
  key: 'chromaKeyAtom',
  default: '#ff00ff',
  effects: [localStorageQueryParamDefaultEffect('chromaKey')]
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
