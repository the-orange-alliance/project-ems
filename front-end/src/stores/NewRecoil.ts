import { apiFetcher, clientFetcher } from '@toa-lib/client';
import {
  AllianceMember,
  Day,
  defaultDay,
  defaultEventSchedule,
  Event,
  EventSchedule,
  eventZod,
  FMSSettings,
  allianceMemberZod,
  isFMSSettingsArray,
  Match,
  MatchParticipant,
  MatchState,
  MatchTimer,
  Ranking,
  reconcileMatchParticipants,
  ScheduleItem,
  scheduleItemZod,
  Team,
  teamZod,
  Tournament,
  tournamentZod,
  User,
  matchZod,
  matchParticipantZod,
  rankingZod
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
import { replaceAllInArray, replaceInArray } from './Util';
import { localStorageEffect } from './Effects';

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
  effects: [localStorageEffect('chromaKey')]
});

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

export const currentEventSelector = selector<Event | null>({
  key: 'currentEventSelector',
  get: ({ get }) =>
    get(eventsAtom).find((e) => e.eventKey === get(currentEventKeyAtom)) ??
    null,
  set: ({ get, set }, newValue) => {
    if (newValue instanceof DefaultValue || !newValue) return;
    const events = get(eventsAtom);
    const eventKey = get(currentEventKeyAtom);
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
    const eventKey = get(currentEventKeyAtom);
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

export const currentTeamsByEventSelector = selector<Team[]>({
  key: `currentTeamsByEventSelector`,
  get: ({ get }) => get(teamsByEventAtomFam(get(currentEventKeyAtom)))
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
 * @section TEAM STATE
 * Recoil state management for teams
 */
export const teamsByEventSelectorFam = selectorFamily<Team[], string>({
  key: 'teamsByEventSelectorFam',
  get: (eventKey: string) => async (): Promise<Team[]> => {
    try {
      if (eventKey.length <= 0) throw new Error('Event key not initialized.');
      return await apiFetcher(
        `teams/${eventKey}`,
        'GET',
        undefined,
        teamZod.array().parse
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

/**
 * @section TOURNAMENT SCHEDULE STATE
 * Recoil state management for tournament schedules
 */
export const schedulesByEventSelectorFam = selectorFamily<
  EventSchedule[],
  string
>({
  key: 'schedulesByEventSelectorFam',
  get: () => async (): Promise<EventSchedule[]> => {
    try {
      // TODO - Need a better way to find all schedules.
      return [];
      // return await clientFetcher(`storage/${eventKey}.json`, 'GET');
    } catch (e) {
      return [];
    }
  }
});

export const schedulesByEventAtomFam = atomFamily<EventSchedule[], string>({
  key: 'schedulesByEventAtomFam',
  default: schedulesByEventSelectorFam
});

export const currentScheduleByTournamentSelector = selector<EventSchedule>({
  key: 'currentScheduleByTournamentSelector',
  get: ({ get }) => {
    const tournament = get(currentTournamentSelector);
    const schedules = get(schedulesByEventAtomFam(tournament?.eventKey ?? ''));
    return (
      schedules.find((s) => s.tournamentKey === tournament?.tournamentKey) ??
      defaultEventSchedule
    );
  },
  set: ({ get, set }, newValue) => {
    const tournament = get(currentTournamentSelector);
    const schedules = get(schedulesByEventAtomFam(tournament?.eventKey ?? ''));
    const currentSchedule = schedules.find(
      (s) => s.tournamentKey === tournament?.tournamentKey
    );
    if (!currentSchedule || newValue instanceof DefaultValue || !newValue) {
      return;
    }
    const newSchedules = replaceInArray(
      schedules,
      'tournamentKey',
      currentSchedule.tournamentKey,
      newValue
    );
    set(
      schedulesByEventAtomFam(currentSchedule.eventKey),
      newSchedules ?? schedules
    );
  }
});

export const currentScheduledTeamsSelector = selector<Team[]>({
  key: 'currentScheduledTeams',
  get: ({ get }) => {
    return get(currentScheduleByTournamentSelector)?.teams ?? [];
  },
  set: ({ get, set }, newValue) => {
    const schedule = get(currentScheduleByTournamentSelector);
    if (!schedule || newValue instanceof DefaultValue) return;
    set(currentScheduleByTournamentSelector, {
      ...schedule,
      teams: newValue,
      teamsParticipating: newValue.length
    });
  }
});

export const currentScheduleDaySelectorFam = selectorFamily<Day, number>({
  key: 'currentScheduleDaySelectorFam',
  get:
    (id: number) =>
    ({ get }) => {
      return get(currentScheduleByTournamentSelector).days[id];
    },
  set:
    (id: number) =>
    ({ set }, newValue) => {
      const newDay = newValue instanceof DefaultValue ? defaultDay : newValue;
      set(currentScheduleByTournamentSelector, (prev) => ({
        ...prev,
        days: replaceInArray(prev.days, 'id', id, newDay) ?? prev.days
      }));
    }
});

/**
 * @section SCHEDULE ITEM STATE
 * Recoil state management for schedule items
 */
export const scheduleItemsByEventSelectorFam = selectorFamily<
  ScheduleItem[],
  string
>({
  key: 'scheduleItemsByEventSelectorFam',
  get: (eventKey: string) => async (): Promise<ScheduleItem[]> => {
    try {
      return await apiFetcher(
        `schedule/${eventKey}`,
        'GET',
        undefined,
        scheduleItemZod.array().parse
      );
    } catch (e) {
      return [];
    }
  }
});

export const scheduleItemsByEventAtomFam = atomFamily<ScheduleItem[], string>({
  key: 'scheduleItemsByEventAtomFam',
  default: scheduleItemsByEventSelectorFam
});

export const currentScheduleItemsByTournamentSelector = selector<
  ScheduleItem[]
>({
  key: 'currentScheduleItemsByTournamentSelector',
  get: ({ get }) => {
    const eventKey = get(currentEventKeyAtom);
    const tournamentKey = get(currentTournamentKeyAtom);
    return get(scheduleItemsByEventAtomFam(eventKey)).filter(
      (i) => i.tournamentKey === tournamentKey
    );
  },
  set: ({ set, get }, newValue) => {
    const eventKey = get(currentEventKeyAtom);
    const tournamentKey = get(currentTournamentKeyAtom);
    if (!eventKey || !tournamentKey || newValue instanceof DefaultValue) {
      return [];
    }
    const scheduleItems = get(scheduleItemsByEventAtomFam(eventKey));
    set(
      scheduleItemsByEventAtomFam(eventKey),
      replaceAllInArray(scheduleItems, 'tournamentKey', tournamentKey, newValue)
    );
  }
});

/**
 * @section MATCH STATE
 * Recoil state management for matches
 */
export const matchStateAtom = atom<MatchState>({
  key: 'matchStateAtom',
  default: MatchState.MATCH_NOT_SELECTED
});

export const matchStatusAtom = atom<string>({
  key: 'matchStatusAtom',
  default: 'NO MATCH SELECTED'
});

export const currentMatchIdAtom = atom<number | null>({
  key: 'currentMatchIdAtom',
  default: null
});

export const currentMatchSelector = selector<Match<any> | null>({
  key: 'currentMatchSelector',
  get: async ({ get }) => {
    const eventKey = get(currentEventKeyAtom);
    const tournamentKey = get(currentTournamentKeyAtom);
    const id = get(currentMatchIdAtom);
    if (!eventKey || !tournamentKey || !id) return null;
    try {
      return await apiFetcher<Match<any>>(
        `match/all/${eventKey}/${tournamentKey}/${id}`,
        'GET',
        undefined,
        matchZod.parse
      );
    } catch (e) {
      console.error(e);
      return null;
    }
  }
});

// This atom is for matches that are selected
export const currentMatchAtom = atom<Match<any> | null>({
  key: 'currentMatchAtom',
  default: currentMatchSelector
});

// This atom is for matches that are currently being played - so that we
// can load/play different matches at the same time.
export const matchInProgressAtom = atom<Match<any> | null>({
  key: 'matchInProgressAtom',
  default: currentMatchSelector
});

// This atom is for match results.
export const matchResultAtom = atom<Match<any> | null>({
  key: 'matchResultAtom',
  default: currentMatchSelector
});

export const matchesByEventSelectorFam = selectorFamily<Match<any>[], string>({
  key: 'matchesByEventSelectorFam',
  get: (eventKey: string) => async (): Promise<Match<any>[]> => {
    try {
      const matches = await apiFetcher(
        `match/${eventKey}`,
        'GET',
        undefined,
        matchZod.array().parse
      );
      const participants = await apiFetcher(
        `match/participants/${eventKey}`,
        'GET',
        undefined,
        matchParticipantZod.array().parse
      );
      return reconcileMatchParticipants(matches, participants);
    } catch (e) {
      return [];
    }
  }
});

export const matchesByEventAtomFam = atomFamily<Match<any>[], string>({
  key: 'matchesByEventSelectorFam',
  default: matchesByEventSelectorFam
});

export const matchesByTournamentSelector = selector<Match<any>[]>({
  key: 'matchesByTournamentSelector',
  get: ({ get }) => {
    const tournament = get(currentTournamentSelector);
    if (!tournament) return [];
    return get(matchesByEventAtomFam(tournament.eventKey)).filter(
      (m) => m.tournamentKey === tournament.tournamentKey
    );
  },
  set: ({ get, set }, newValue) => {
    const tournament = get(currentTournamentSelector);
    if (!tournament || newValue instanceof DefaultValue) return;
    const matches = get(matchesByEventAtomFam(tournament.eventKey));
    set(
      matchesByEventAtomFam(tournament.eventKey),
      replaceAllInArray(
        matches,
        'tournamentKey',
        tournament.tournamentKey,
        newValue
      )
    );
  }
});

export const matchByCurrentIdSelectorFam = selectorFamily<
  Match<any> | undefined,
  number
>({
  key: 'matchByCurrentIdSelectorFam',
  get:
    (id: number) =>
    ({ get }) =>
      get(matchesByTournamentSelector).find((m) => m.id === id),
  set:
    (id: number) =>
    ({ get, set }, newValue) => {
      const matches = get(matchesByTournamentSelector);
      if (!newValue || newValue instanceof DefaultValue) return;
      set(
        matchesByTournamentSelector,
        replaceInArray(matches, 'id', id, newValue) ?? matches
      );
    }
});

export const matchInProgressParticipantsSelector = selector<MatchParticipant[]>(
  {
    key: 'matchInProgressParticipantsSelector',
    get: ({ get }) => get(matchInProgressAtom)?.participants || [],
    set: ({ set, get }, newValue) => {
      const participants = newValue instanceof DefaultValue ? [] : newValue;
      const match = get(matchInProgressAtom);
      if (!match) return;
      set(matchInProgressAtom, { ...Object.assign({}, match), participants });
    }
  }
);

export const matchInProgressParticipantsByStationSelectorFam = selectorFamily<
  MatchParticipant | undefined,
  number
>({
  key: 'matchInProgressParticipantsByAllianceSelector',
  get:
    (station: number) =>
    ({ get }) =>
      get(matchInProgressParticipantsSelector).find(
        (p) => p.station === station
      ),
  set:
    (station: number) =>
    ({ get, set }, newValue) => {
      const participants = get(matchInProgressParticipantsSelector);
      if (!newValue || newValue instanceof DefaultValue) return;
      set(
        matchInProgressParticipantsSelector,
        replaceInArray(participants, 'station', station, newValue) ??
          participants
      );
    }
});

/**
 * @section RANKINGS STATE
 * Recoil state management for rankings.
 */
export const rankingsByEventSelectorFam = selectorFamily<Ranking[], string>({
  key: 'rankingsByEventSelectorFam',
  get: (eventKey: string) => async (): Promise<Ranking[]> => {
    try {
      return await apiFetcher(
        `ranking/${eventKey}`,
        'GET',
        undefined,
        rankingZod.array().parse
      );
    } catch (e) {
      return [];
    }
  }
});

export const rankingsByEventAtomFam = atomFamily<Ranking[], string>({
  key: 'rankingsByEventAtomFam',
  default: rankingsByEventSelectorFam
});

export const currentRankingsByTournamentSelector = selector<Ranking[] | null>({
  key: 'currentRankingsByTournamentSelector',
  get: async ({ get }) => {
    const tournament = get(currentTournamentSelector);
    if (!tournament) return null;
    const { eventKey, tournamentKey } = tournament;
    return await apiFetcher(
      `ranking/${eventKey}/${tournamentKey}`,
      'GET',
      undefined,
      rankingZod.array().parse
    );
  }
});

export const currentRankingsByMatchSelector = selector<Ranking[] | null>({
  key: 'currentRankingsByMatchSelector',
  get: async ({ get }) => {
    const match = get(matchInProgressAtom);
    if (!match) return null;
    const { eventKey, tournamentKey, id } = match;
    return await apiFetcher(
      `ranking/${eventKey}/${tournamentKey}/${id}`,
      'GET',
      undefined,
      rankingZod.array().parse
    );
  }
});

/**
 * @section ALLIANCE MEMBER STATE
 * Recoil stae management for alliance members of a tournament level
 */

const defaultAllianceMembersByEventSelectorFam = selectorFamily<
  AllianceMember[],
  string
>({
  key: 'allianceMembersByEventSelectorFam',
  get: (eventKey: string) => async (): Promise<AllianceMember[]> => {
    try {
      return await apiFetcher<AllianceMember[]>(
        `alliance/${eventKey}`,
        'GET',
        undefined,
        allianceMemberZod.array().parse
      );
    } catch (e) {
      return [];
    }
  }
});

export const allianceMembersByEventAtomFam = atomFamily<
  AllianceMember[],
  string
>({
  key: 'allianceMembersByEventAtomFam',
  default: defaultAllianceMembersByEventSelectorFam
});

export const allianceMembersByTournamentSelector = selector<AllianceMember[]>({
  key: 'allianceMembersByTournamentSelector',
  get: ({ get }) => {
    const eventKey = get(currentEventKeyAtom);
    const tournamentKey = get(currentTournamentKeyAtom);
    return get(allianceMembersByEventAtomFam(eventKey)).filter(
      (a) => a.tournamentKey === tournamentKey
    );
  },
  set: ({ get, set }, newValue) => {
    const eventKey = get(currentEventKeyAtom);
    const tournamentKey = get(currentTournamentKeyAtom);
    if (
      !eventKey ||
      !tournamentKey ||
      newValue instanceof DefaultValue ||
      !newValue
    ) {
      return;
    }
    const allianceMembers = get(allianceMembersByEventAtomFam(eventKey));
    set(
      allianceMembersByEventAtomFam(eventKey),
      replaceAllInArray(
        allianceMembers,
        'tournamentKey',
        tournamentKey,
        newValue
      )
    );
  }
});

/**
 * @section MATCH PLAYING STATE
 * Recoil state management for when matches are currently being played.
 */
export const timer: MatchTimer = new MatchTimer();

export const matchTimeAtom = atom({
  key: 'matchTimeAtom',
  default: timer.timeLeft
});

export const matchTimeModeAtom = atom({
  key: 'matchTimeModeAtom',
  default: timer.modeTimeLeft
});

export const redBonusActiveAtom = atom({
  key: 'redBonusActiveAtom',
  default: false
});

export const blueBonusActiveAtom = atom({
  key: 'blueBonusActiveAtom',
  default: false
});
