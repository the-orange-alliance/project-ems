import { clientFetcher } from '@toa-lib/client';
import {
  Day,
  defaultEvent,
  defaultEventSchedule,
  Event,
  isEvent,
  isTeamArray,
  PRACTICE_LEVEL,
  QUALIFICATION_LEVEL,
  RANKING_LEVEL,
  ROUND_ROBIN_LEVEL,
  Team,
  TEST_LEVEL,
  TournamentType,
  User,
  EventSchedule,
  defaultDay,
  ScheduleItem,
  isScheduleItemArray
} from '@toa-lib/models';
import {
  atom,
  atomFamily,
  DefaultValue,
  selector,
  selectorFamily
} from 'recoil';
import { setApiStorage } from 'src/api/ApiProvider';
import { AppFlags, defaultFlags } from './AppFlags';

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
export const selectedTournamentLevel = atom<number>({
  key: 'selectedTournamentLevelAtom',
  default: TEST_LEVEL
});
export const selectedTournamentType = selector<TournamentType>({
  key: 'selectedTournamentTypeAtom',
  get: ({ get }) => {
    const level = get(selectedTournamentLevel);
    switch (level) {
      case TEST_LEVEL:
        return 'Test';
      case PRACTICE_LEVEL:
        return 'Practice';
      case QUALIFICATION_LEVEL:
        return 'Qualification';
      case ROUND_ROBIN_LEVEL:
        return 'Round Robin';
      case RANKING_LEVEL:
        return 'Ranking';
      default:
        return 'Eliminations';
    }
  }
});

/* FLAGS SECTION - Application flags */
export const appFlagsAtom = atom<AppFlags>({
  key: 'appFlagsAtom',
  default: selector<AppFlags>({
    key: 'appFlagsAtomSelector',
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

/* UI SECTION - UI Dialogs/Options */
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

export const teamsInScheduleSelectorFamily = selectorFamily<
  Team[],
  TournamentType
>({
  key: 'teamsInScheduleAtomFamily',
  get:
    (type: TournamentType) =>
    ({ get }) =>
      get(tournamentScheduleAtomFamily(type)).teams,
  set:
    (type: TournamentType) =>
    ({ set }, newValue) =>
      set(tournamentScheduleAtomFamily(type), (prev) => ({
        ...prev,
        teams: newValue instanceof DefaultValue ? [] : newValue
      }))
});

export const teamsInCurrentSchedule = selector<Team[]>({
  key: 'teamsInCurrentScheduleSelector',
  get: ({ get }) =>
    get(teamsInScheduleSelectorFamily(get(selectedTournamentType))),
  set: ({ get, set }, newValue) =>
    set(teamsInScheduleSelectorFamily(get(selectedTournamentType)), newValue)
});

/* SCHEDULE SECTION - State management for schedule-related items */
export const tournamentScheduleAtomFamily = atomFamily<
  EventSchedule,
  TournamentType
>({
  key: 'tournamentScheduleAtomFamily',
  default: selectorFamily<EventSchedule, TournamentType>({
    key: 'tournamentScheduleAtomFamilySelectorFamily',
    get: (type: TournamentType) => async () => {
      try {
        return (await clientFetcher(
          `storage/${type}.json`,
          'GET'
        )) as EventSchedule;
      } catch (e) {
        return defaultEventSchedule;
      }
    }
  })
});

export const tournamentScheduleSelector = selector<EventSchedule>({
  key: 'tournamentScheduleSelector',
  get: ({ get }) =>
    get(tournamentScheduleAtomFamily(get(selectedTournamentType))),
  set: ({ get, set }, newValue) =>
    set(tournamentScheduleAtomFamily(get(selectedTournamentType)), newValue)
});

export const tournamentScheduleDaySelector = selectorFamily<Day, number>({
  key: 'tournamentScheduleDaySelector',
  get:
    (id: number) =>
    ({ get }) =>
      get(tournamentScheduleSelector).days[id],
  set:
    (id: number) =>
    ({ set }, newValue) => {
      const newDay = newValue instanceof DefaultValue ? defaultDay : newValue;
      set(tournamentScheduleSelector, (prev) => ({
        ...prev,
        days: [...prev.days.slice(0, id), newDay, ...prev.days.slice(id + 1)]
      }));
    }
});

export const tournamentScheduleItemAtomFamily = atomFamily<
  ScheduleItem[],
  TournamentType
>({
  key: 'tournamentScheduleItemAtomFamily',
  default: selectorFamily<ScheduleItem[], TournamentType>({
    key: 'tournamentScheduleItemAtomFamilySelectorFamily',
    get: (type: TournamentType) => async () => {
      try {
        return await clientFetcher(
          `schedule/${type}`,
          'GET',
          undefined,
          isScheduleItemArray
        );
      } catch (e) {
        // TODO - better error-handling
        return [];
      }
    }
  })
});
