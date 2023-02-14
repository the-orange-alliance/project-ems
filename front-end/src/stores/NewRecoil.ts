import { clientFetcher } from '@toa-lib/client';
import {
  Event,
  isEventArray,
  isTeamArray,
  isTournamentArray,
  Team,
  Tournament
} from '@toa-lib/models';
import {
  atom,
  atomFamily,
  DefaultValue,
  selector,
  selectorFamily
} from 'recoil';
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

export const currentTeamKeyAtom = atom<number | null>({
  key: 'currentTeamKeyAtom',
  default: null
});

export const currentTeamSelector = selector<Team | null>({
  key: 'currentTeamSelector',
  get: ({ get }) => {
    const teamKey = get(currentTeamKeyAtom);
    const eventKey = get(currentEventKeySelector);
    const team = get(teamsByEventAtomFam(eventKey));
    return (
      team.find((t) => t.teamKey === teamKey && t.eventKey === eventKey) ?? null
    );
  },
  set: ({ get, set }, newValue) => {
    if (newValue instanceof DefaultValue || !newValue) return;
    const teams = get(teamsByEventAtomFam(newValue.eventKey));
    const newTeams = replaceInArray(
      teams,
      'teamKey',
      newValue.teamKey,
      newValue
    );
    set(teamsByEventAtomFam(newValue.eventKey), newTeams ?? teams);
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

/**
 * @section TOURNAMENT STATE
 * Recoil state management for tournaments
 */
export const tournamentsByEventSelectorFam = selectorFamily<
  Tournament[],
  string
>({
  key: 'tournamentsByEventSelectorFam',
  get: (eventKey: string) => async (): Promise<Tournament[]> => {
    try {
      return await clientFetcher(
        `tournaments/${eventKey}`,
        'GET',
        undefined,
        isTournamentArray
      );
    } catch (e) {
      return [];
    }
  }
});

export const tournamentsByEventAtomFam = atomFamily<Tournament[], string>({
  key: 'tournamentsByEventAtomFam',
  default: tournamentsByEventSelectorFam
});

export const currentTournamentKeyAtom = atom<string | null>({
  key: 'currentTournamentKeyAtom',
  default: null
});

export const currentTournamentSelector = selector<Tournament | null>({
  key: 'currentTournamentSelector',
  get: ({ get }) => {
    const tournamentKey = get(currentTournamentKeyAtom);
    const eventKey = get(currentEventKeySelector);
    const tournaments = get(tournamentsByEventAtomFam(eventKey));
    return (
      tournaments.find(
        (t) => t.tournamentKey === tournamentKey && t.eventKey === eventKey
      ) ?? null
    );
  },
  set: ({ get, set }, newValue) => {
    if (newValue instanceof DefaultValue || !newValue) return;
    const tournaments = get(tournamentsByEventAtomFam(newValue.eventKey));
    const newTeams = replaceInArray(
      tournaments,
      'tournamentKey',
      newValue.tournamentKey,
      newValue
    );
    set(tournamentsByEventAtomFam(newValue.eventKey), newTeams ?? tournaments);
  }
});
