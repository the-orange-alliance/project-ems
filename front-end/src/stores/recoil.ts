import { clientFetcher } from '@toa-lib/client';
import {
  Alliance,
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
  MatchState,
  TournamentType,
  User,
  EventSchedule,
  defaultDay,
  ScheduleItem,
  isScheduleItemArray,
  Match,
  isMatchArray,
  isMatchParticipantArray,
  reconcileMatchParticipants,
  MatchParticipant,
  MatchTimer,
  isMatch,
  getTournamentLevelFromType,
  Ranking,
  isRankingArray,
  isAllianceArray,
  AllianceMember,
  FINALS_LEVEL
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

/* Basic UI options */
export const darkModeAtom = atom<boolean>({
  key: 'darkModeAtom',
  default: false
});
export const userAtom = atom<User | null>({
  key: 'userAtom',
  default: null
});
export const hostIP = atom<string>({
  key: 'hostIPAtom',
  default: window.location.hostname
});
export const eventFields = selector<number[]>({
  key: 'fieldsSelector',
  get: () => {
    return [];
  }
});
export const fieldControl = atom<number[]>({
  key: 'fieldsAtom',
  default: eventFields
});
export const followerMode = atom<boolean>({
  key: 'followerModeAtom',
  default: false
});

/* Internal state management */
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
      case FINALS_LEVEL:
        return 'Finals';
      default:
        return 'Eliminations';
    }
  }
});

/* SOCKET SECTION */
export const socketConnectedAtom = atom<boolean>({
  key: 'socketConnectedAtom',
  default: false
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

export const matchEditDialogOpen = atom<boolean>({
  key: 'matchEditDialogOpen',
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

export const teamByTeamKey = selectorFamily<Team | undefined, number>({
  key: 'teamByTeamKeySelectorFamily',
  get:
    (teamKey: number) =>
    ({ get }) =>
      get(teamsAtom).find((t) => t.teamKey === teamKey)
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
        return await clientFetcher<ScheduleItem[]>(
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

/* MATCHES SECTION - state management involving matches for tournaments */
export const timer: MatchTimer = new MatchTimer();

export const matchStateAtom = atom<MatchState>({
  key: 'matchStateAtom',
  default: MatchState.MATCH_NOT_SELECTED
});

export const matchModeAtom = atom<string>({
  key: 'matchModeAtom',
  default: 'NO MATCH SELECTED'
});

export const loadedMatchKey = atom<string | null>({
  key: 'loadedMatchKeyAtom',
  default: null
});

export const matchResult = atom<Match<any> | null>({
  key: 'matchResultAtom',
  default: null
});

export const defaultMatches = selector<Match<any>[]>({
  key: 'matchesAtomSelector',
  get: async () => {
    try {
      const matches = await clientFetcher<Match<any>[]>(
        'match',
        'GET',
        undefined,
        isMatchArray
      );
      const participants = await clientFetcher<MatchParticipant[]>(
        'match/participants',
        'GET',
        undefined,
        isMatchParticipantArray
      );
      return reconcileMatchParticipants(matches, participants);
    } catch (e) {
      // TODO - Better error-handling
      return [];
    }
  }
});

export const matches = atom<Match<any>[]>({
  key: 'matchesAtom',
  default: defaultMatches
});

export const matchesByEventKey = selectorFamily<Match<any> | undefined, string>(
  {
    key: 'matchByMatchKeySelectorFamily',
    get:
      (eventKey: string) =>
      ({ get }) =>
        get(matches).find((m) => m.eventKey === eventKey),
    set:
      (eventKey: string) =>
      ({ get, set }, newValue) => {
        if (newValue instanceof DefaultValue || !newValue) return;
        const oldMatches = get(matches);
        const index = oldMatches.findIndex((m) => m.eventKey === eventKey);
        if (index < 0) return;
        set(matches, [
          ...oldMatches.slice(0, index),
          newValue,
          ...oldMatches.slice(index + 1)
        ]);
      }
  }
);

export const matchesByTournamentKey = selectorFamily<Match<any>[], string>({
  key: 'matchesByTournamentKeySelectorFamily',
  get:
    (key: string) =>
    ({ get }) =>
      get(matches).filter((m) => m.tournamentKey === key)
});

export const loadedMatch = selector<Match<any> | undefined>({
  key: 'loadedMatchSelector',
  get: ({ get }) => get(matchesByEventKey(get(loadedMatchKey) || ''))
});

export const loadedMatchParticipantsByAlliance = selectorFamily<
  MatchParticipant[],
  Alliance
>({
  key: 'loadedMatchParticipantsSelector',
  get:
    (a: Alliance) =>
    ({ get }) =>
      get(loadedMatch)?.participants?.filter((p) =>
        a === 'red' ? p.station < 20 : p.station >= 20
      ) || []
});

export const matchTimeAtom = atom({
  key: 'matchTimeAtom',
  default: timer.timeLeft
});

export const matchInProgress = atom<Match<any> | null>({
  key: 'matchInProgress',
  default: selector<Match<any> | null>({
    key: 'matchInProgressSelector',
    get: async ({ get }) => {
      const matchKey = get(loadedMatchKey);
      try {
        return await clientFetcher<Match<any>>(
          `match/all/${matchKey}`,
          'GET',
          undefined,
          isMatch
        );
      } catch (e) {
        // TODO - better error-handling
        return null;
      }
    }
  })
});

export const matchInProgressParticipants = selector<
  MatchParticipant[] | undefined
>({
  key: 'matchInProgressParticipants',
  get: ({ get }) => get(matchInProgress)?.participants || [],
  set: ({ set, get }, defaultValue) => {
    const participants =
      defaultValue instanceof DefaultValue ? [] : defaultValue;
    const oldMatch: Match<any> | null = get(matchInProgress);
    const newMatch: Match<any> | null = Object.assign({}, oldMatch);
    newMatch.participants = participants;
    if (newMatch) {
      set(matchInProgress, newMatch);
    }
  }
});

export const matchInProgressParticipantByKey = selectorFamily<
  MatchParticipant | undefined,
  string
>({
  key: 'matchInProgressParticipantByKeySelectorFamily',
  set:
    (participantKey: string) =>
    ({ set, get }, newValue) => {
      const oldParticipants = get(matchInProgressParticipants);
      if (newValue instanceof DefaultValue || !newValue || !oldParticipants)
        return;
      const index = oldParticipants?.findIndex(
        (p) => p.matchParticipantKey === participantKey
      );
      if (index < 0) return;
      set(matchInProgressParticipants, [
        ...oldParticipants.slice(0, index),
        newValue,
        ...oldParticipants.slice(index + 1)
      ]);
    },
  get:
    (participantKey: string) =>
    ({ get }) =>
      get(matchInProgressParticipants)?.find(
        (p) => p.matchParticipantKey === participantKey
      )
});

export const matchInProgressDetails = selector<MatchDetails | null>({
  key: 'matchInProgressDetails',
  get: ({ get }) => get(matchInProgress)?.details || null,
  set: ({ set, get }, defaultValue) => {
    const details = defaultValue instanceof DefaultValue ? null : defaultValue;
    const oldMatch = get(matchInProgress);
    const newMatch = Object.assign({}, oldMatch);
    if (newMatch && details) {
      set(matchInProgress, { ...newMatch, details });
    }
  }
});

/*RANKINGS SECTION  */
export const rankings = selectorFamily<Ranking[], number>({
  key: 'rankingsAtom',
  get: (tournamentLevel: number) => async () => {
    try {
      return await clientFetcher<Ranking[]>(
        `ranking?tournamentLevel=${tournamentLevel}`,
        'GET',
        undefined,
        isRankingArray
      );
    } catch (e) {
      // TODO - better error-handling
      return [];
    }
  }
});

export const rankingsByMatch = selectorFamily<Ranking[], string>({
  key: 'rankingsByMatch',
  get:
    (matchKey: string) =>
    async ({ get }) => {
      const match = get(matchByMatchKey(matchKey));
      if (!match || !match.participants) return [];
      return get(rankings(match.tournamentLevel)).filter((r) =>
        match.participants?.find((p) => p.teamKey === r.teamKey)
      );
    }
});

/* ALLIANCE SECTION */
export const allinaceMembers = atom<AllianceMember[]>({
  key: 'allianceAtom',
  default: selector<AllianceMember[]>({
    key: 'allianceSelector',
    get: async () => {
      try {
        return await clientFetcher<AllianceMember[]>(
          `alliance`,
          'GET',
          undefined,
          isAllianceArray
        );
      } catch (e) {
        // TODO - better error-handling
        return [];
      }
    }
  })
});

/* AUDIENCE DISPLAY SECTION */
export const displayID = atom({
  key: 'displayIDAtom',
  default: 0
});
export const displayChromaKey = atom({
  key: 'chromaKeyAtom',
  default: '#ff00ff'
});
