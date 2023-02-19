import { clientFetcher } from '@toa-lib/client';
import {
  ApiResponseError,
  User,
  isUser,
  isUserLoginResponse,
  isUserArray,
  isRankingArray,
  UserLoginResponse,
  Event,
  isEvent,
  Team,
  ScheduleItem,
  MatchMakerParams,
  Match,
  isMatchArray,
  MatchDetailBase,
  MatchParticipant,
  Ranking,
  TournamentType,
  AllianceMember,
  isMatch,
  Tournament
} from '@toa-lib/models';
import useSWR, { SWRResponse } from 'swr';

/** Simple requests for POST, PUT, DELETE */
export const login = async (
  username: string,
  password: string
): Promise<UserLoginResponse> =>
  clientFetcher(
    'auth/login',
    'POST',
    {
      username,
      password
    },
    isUserLoginResponse
  );

export const logout = async (): Promise<void> =>
  clientFetcher('auth/logout', 'GET');

export const setupEventBase = async (seasonKey: string): Promise<void> =>
  clientFetcher(`event/setup/${seasonKey}`, 'GET');

export const setupDefaultAccounts = async (): Promise<void> =>
  clientFetcher('auth/setup', 'GET');

export const purgeAll = async (): Promise<void> =>
  clientFetcher('admin/purge', 'DELETE');

/** Requests to manipulate data */
export const setApiStorageKey = async (
  file: string,
  key: string,
  data: unknown
): Promise<void> => clientFetcher('storage', 'PATCH', { file, key, data });

export const setApiStorage = async (
  file: string,
  data: unknown
): Promise<void> => clientFetcher('storage', 'POST', { file, data });

export const postEvent = async (event: Event): Promise<void> =>
  clientFetcher('event', 'POST', event);

export const patchEvent = async (
  eventKey: string,
  event: Event
): Promise<void> => clientFetcher(`event/${eventKey}`, 'PATCH', event);

export const postTeams = async (teams: Team[]): Promise<void> =>
  clientFetcher('teams', 'POST', teams);

export const patchTeam = async (teamKey: string, team: Team): Promise<void> =>
  clientFetcher(`teams/${teamKey}`, 'PATCH', team);

export const postTournaments = async (
  tournaments: Tournament[]
): Promise<void> => clientFetcher('tournament', 'POST', tournaments);

export const patchTournament = async (tournament: Tournament): Promise<void> =>
  clientFetcher(
    `tournament/${tournament.eventKey}/${tournament.tournamentKey}`,
    'POST',
    tournament
  );

export const postSchedule = async (items: ScheduleItem[]): Promise<void> =>
  clientFetcher('schedule', 'POST', items);

export const patchSchedule = async (item: ScheduleItem): Promise<void> =>
  clientFetcher(`${item.eventKey}/schedule/${item.id}`, 'PATCH', item);

export const deleteSchedule = (
  eventKey: string,
  tournamentKey: string
): Promise<void> =>
  clientFetcher(`schedule/${eventKey}/${tournamentKey}`, 'DELETE');

export const createMatchSchedule = async (
  params: MatchMakerParams
): Promise<Match[]> =>
  clientFetcher('match/create', 'POST', params, isMatchArray);

export const postMatchSchedule = async (matches: Match[]): Promise<void> =>
  clientFetcher('match', 'POST', matches);

export const patchMatch = async (match: Match): Promise<void> =>
  clientFetcher(`match/${match.matchKey}`, 'PATCH', match);

export const patchMatchDetails = async (details: MatchDetails): Promise<void> =>
  clientFetcher(`match/${details.matchKey}/details`, 'PATCH', details);

export const patchMatchParticipants = async (
  participants: MatchParticipant[]
): Promise<void> =>
  clientFetcher(
    `match/${participants[0].matchKey}/participants`,
    'PATCH',
    participants
  );

export const patchWholeMatch = async (match: Match): Promise<void> => {
  try {
    const promises: Promise<any>[] = [];
    promises.push(patchMatch(match));
    if (match.details) {
      patchMatchDetails(match.details);
    }
    if (match.participants) {
      patchMatchParticipants(match.participants);
    }
    await Promise.all(promises);
  } catch (e) {
    // TODO - better error-handling
    console.log(e);
  }
};

export const createRankings = (
  tournamentKey: string,
  teams: Team[]
): Promise<void> =>
  clientFetcher(`ranking/create/${tournamentKey}`, 'POST', teams);

export const postRankings = (rankings: Ranking[]): Promise<void> =>
  clientFetcher(`ranking`, 'POST', rankings);

export const recalculateRankings = (
  tournamentLevel: number
): Promise<Ranking[]> =>
  clientFetcher(`ranking/calculate/${tournamentLevel}`, 'POST', isRankingArray);

export const postAllianceMembers = (members: AllianceMember[]): Promise<void> =>
  clientFetcher(`alliance`, 'POST', members);

/** React hooks to use GET requests for data. */
export const useLoginAttempt = (
  username: string,
  password: string
): SWRResponse<User, ApiResponseError> =>
  useSWR<User>(
    'auth/login',
    (url) => clientFetcher(url, 'POST', { username, password }, isUser),
    { revalidateOnFocus: false }
  );

export const useUsers = (): SWRResponse<User[], ApiResponseError> =>
  useSWR<User[]>(
    'auth/users',
    (url) => clientFetcher(url, 'GET', undefined, isUserArray),
    { revalidateOnFocus: false }
  );

export const useEvent = (): SWRResponse<Event, ApiResponseError> =>
  useSWR<Event>(
    'event',
    (url) => clientFetcher(url, 'GET', undefined, isEvent),
    { revalidateOnFocus: false }
  );

export const useApiStorage = <T>(
  file: string
): SWRResponse<T, ApiResponseError> =>
  useSWR<T>(`storage/${file}`, (url) => clientFetcher(url, 'GET'), {
    revalidateOnFocus: false
  });

export const useTeams = (): SWRResponse<Team[], ApiResponseError> =>
  useSWR('teams', (url) => clientFetcher(url, 'GET'), {
    revalidateOnFocus: false
  });

export const useMatchAll = (
  matchKey?: string
): SWRResponse<Match, ApiResponseError> =>
  useSWR<Match>(
    matchKey ? `match/all/${matchKey}` : '',
    (url) => clientFetcher(url, 'GET', undefined, isMatch),
    {
      revalidateOnFocus: false
    }
  );
