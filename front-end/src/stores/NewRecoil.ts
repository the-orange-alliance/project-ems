import { clientFetcher } from '@toa-lib/client';
import { Event, isEventArray, isTeamArray, Team } from '@toa-lib/models';
import {
  atom,
  atomFamily,
  DefaultValue,
  selector,
  selectorFamily
} from 'recoil';
import { eventKeySelector } from './Recoil';
import { replaceInArray } from './Util';

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

/**
 * @section SELECTION STATE
 * Recoil state management for selecting data
 */
export const currentEventKeySelector = selector<string>({
  key: 'currentEventKeySelector',
  get: () => {
    const [, eventKey] = window.location.pathname.split('/');
    return eventKey;
  }
});

export const currentEventSelector = selector<Event | null>({
  key: 'currentEventSelector',
  get: ({ get }) =>
    get(eventsAtom).find((e) => e.eventKey === get(currentEventKeySelector)) ??
    null,
  set: ({ get, set }, newValue) => {
    if (newValue instanceof DefaultValue || !newValue) return;
    const events = get(eventsAtom);
    const eventKey = get(currentEventKeySelector);
    const newEvents = replaceInArray(events, 'eventKey', eventKey, newValue);
    set(eventsAtom, newEvents ?? events);
  }
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
      return await clientFetcher('event', 'GET', undefined, isEventArray);
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

/**
 * @section TEAM STATE
 * Recoil state management for teams
 */
const teamsByEventSelectorFam = selectorFamily<Team[], string>({
  key: 'teamsByEventSelectorFam',
  get: (eventKey: string) => async (): Promise<Team[]> => {
    try {
      return await clientFetcher(
        `teams/${eventKey}`,
        'GET',
        undefined,
        isTeamArray
      );
    } catch (e) {
      return [];
    }
  }
});

export const teamsByEventAtomFam = atomFamily<Team[], string>({
  key: 'teamsByEventAtomFam',
  default: teamsByEventSelectorFam
});
