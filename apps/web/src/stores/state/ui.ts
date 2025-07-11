import { SyncPlatform, Team, User } from '@toa-lib/models';
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

/**
 * @section UI STATE - settings
 */
export const darkModeSettingAtom = atomWithStorage<'light' | 'dark' | 'system'>(
  'colorTheme',
  'system'
);
export const darkModeAtom = atom<boolean>((get) => {
  const darkSetting = get(darkModeSettingAtom);
  if (darkSetting === 'system') {
    return (
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  } else {
    return darkSetting === 'dark';
  }
});
export const userAtom = atom<User | null>(null);
export const teamIdentifierAtom = atom<keyof Team>('teamKey');
export const isFollowerAtom = atom<boolean>(false);
export const followerHostAtom = atom<string>('');
export const syncPlatformAtom = atom<SyncPlatform>(SyncPlatform.DISABLED);
export const syncApiKeyAtom = atom<string>('');
export const isAudioEnabledForScorekeeper = atom<boolean>(false);
export const fieldsAtom = atom<string[]>([]);

/**
 * @section UI STATE - internals
 */
export const isSocketConnectedAtom = atom<boolean>(false);
export const isSnackbarOpenAtom = atom<boolean>(false);
export const snackbarMessageAtom = atom<string>('');
export const isSnackbarDetailsShownAtom = atom<boolean>(false);
export const snackbarErrorMessageAtom = atom<string>('');
export const isMatchDiaogOpenAtom = atom<boolean>(false);
export const appbarConfigAtom = atom<{
  title?: string;
  titleLink?: string;
  showSettings?: boolean;
  showFullscreen?: boolean;
}>({ title: 'Event Management System', showSettings: true });
