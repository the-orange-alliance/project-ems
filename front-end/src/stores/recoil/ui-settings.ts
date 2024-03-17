import { User, Team } from '@toa-lib/models';
import { atom } from 'recoil';
import { localStorageEffect } from '../Effects';

/**
 * @section UI SETTINGS STATE
 * Recoil state management for UI settings
 */
export const darkModeAtom = atom<boolean>({
  key: 'darkModeAtom',
  default: false,
  effects: [localStorageEffect('darkMode')]
});
export const userAtom = atom<User | null>({
  key: 'userAtom',
  default: { id: 0, username: 'Bypassed', permissions: '*' },
  effects: [localStorageEffect('currentUser')]
});
export const teamIdentifierAtom = atom<keyof Team>({
  key: 'teamIdentifierAtom',
  default: 'teamKey',
  effects: [localStorageEffect('teamIdentifier')]
});
export const followerModeEnabledAtom = atom<boolean>({
  key: 'followerModeEnabledAtom',
  default: false,
  effects: [localStorageEffect('followerMode')]
});
export const leaderApiHostAtom = atom<string>({
  key: 'leaderApiHostAtom',
  default: '',
  effects: [localStorageEffect('leaderApiHost')]
});

/**
 * @section UI STATE
 * Recoil state management for global UI interactions
 */
export const snackbarOpenAtom = atom<boolean>({
  key: 'snackbarOpenAtom',
  default: false
});
export const snackbarMessageAtom = atom<string>({
  key: 'snackbarMessageAtom',
  default: ''
});
export const snackbarUseShowAtom = atom<boolean>({
  key: 'snackbarUseShowAtom',
  default: false
});
export const snackbarErrorAtom = atom<string>({
  key: 'snackbarErrorAtom',
  default: ''
});
export const matchDialogOpenAtom = atom<boolean>({
  key: 'matchDialogOpenAtom',
  default: false
});
