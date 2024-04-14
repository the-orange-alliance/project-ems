import { apiFetcher, clientFetcher } from '@toa-lib/client';
import {
  Event,
  eventZod,
  FMSSettings,
  isFMSSettingsArray,
  Tournament,
  tournamentZod
} from '@toa-lib/models';
import {
  atom,
  atomFamily,
  DefaultValue,
  selector,
  selectorFamily
} from 'recoil';
import { setApiStorage } from 'src/api/use-storage-data';
import { AppFlags, defaultFlags } from './AppFlags';
import { replaceInArray } from './Util';
import { localStorageEffect } from './Effects';

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
export const socketConnectedAtom = atom<boolean>({
  key: 'socketConnectedAtom',
  default: false
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

/**
 * @section SELECTION STATE
 * Recoil state management for selecting data
 */
export const currentEventKeyAtom = atom<string>({
  key: 'currentEventKeySelector',
  default: ''
});

export const currentTeamKeyAtom = atom<number | null>({
  key: 'currentTeamKeyAtom',
  default: null
});

export const currentTournamentFieldsSelector = selector<
  {
    name: string;
    field: number;
  }[]
>({
  key: 'currentTournamentFieldsSelector',
  get: ({ get }) => {
    return (
      get(currentTournamentSelector)?.fields.map((f: string, i: number) => ({
        name: f,
        field: i + 1
      })) ?? []
    );
  }
});

export const currentTournamentFieldsAtom = atom<
  {
    name: string;
    field: number;
  }[]
>({
  key: 'currentTournamentFieldsAtom',
  default: currentTournamentFieldsSelector,
  effects: [localStorageEffect('tournamentFieldControl')]
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
      return await apiFetcher(
        `tournament/${eventKey}`,
        'GET',
        undefined,
        tournamentZod.array().parse
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
    const eventKey = get(currentEventKeyAtom);
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
