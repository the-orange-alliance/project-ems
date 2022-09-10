import { clientFetcher } from '@toa-lib/client';
import {
  defaultEvent,
  Event,
  isEvent,
  isTeamArray,
  Team,
  User
} from '@toa-lib/models';
import { atom, selector } from 'recoil';

export const darkModeAtom = atom<boolean>({
  key: 'darkModeAtom',
  default: false
});

export const userAtom = atom<User | null>({
  key: 'userAtom',
  default: null
});

export const selectedTeamAtom = atom<Team | null>({
  key: 'selectedTeamAtom',
  default: null
});

/* RECOIL SECTION - UI Dialogs/Options */
export const teamDialogOpen = atom<boolean>({
  key: 'teamDialogOpenAtom',
  default: false
});

export const teamRemoveDialogOpen = atom<boolean>({
  key: 'teamRemoveDialogOpenAtom',
  default: false
});

/* EVENT SECTION - State management for event */
export const eventAtom = atom<Event>({
  key: 'eventAtom',
  default: selector<Event>({
    key: 'eventAtomSelector',
    get: async (): Promise<Event> => {
      try {
        return await clientFetcher('event', 'GET', undefined, isEvent);
      } catch (e) {
        // TODO - Better error-handling
        return defaultEvent;
      }
    }
  })
});

export const eventKeySelector = selector<string>({
  key: 'eventKeySelector',
  get: ({ get }) => get(eventAtom).eventKey
});

/* TEAMS SECTION - State management for event teams */
export const teamsAtom = atom<Team[]>({
  key: 'teamsAtom',
  default: selector<Team[]>({
    key: 'teamsAtomSelector',
    get: async (): Promise<Team[]> => {
      try {
        return await clientFetcher('teams', 'GET', undefined, isTeamArray);
      } catch (e) {
        // TODO - Better error-handling
        return [];
      }
    }
  })
});
