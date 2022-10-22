import { DateTime } from 'luxon';
import { AllianceMember } from './Alliance.js';
import { CarbonCaptureDetails } from './seasons/index.js';
import { EventSchedule, ScheduleItem, TournamentType } from './Schedule.js';
import { Team } from './Team.js';
import { isArray, isNonNullObject, isNumber, isString } from './types.js';

// Tournament Levels
export const TEST_LEVEL = 0;
export const PRACTICE_LEVEL = 1;
export const QUALIFICATION_LEVEL = 2;
export const ROUND_ROBIN_LEVEL = 20;
export const RANKING_LEVEL = 30;
export const OCTOFINALS_LEVEL = 100;
export const QUARTERFINALS_LEVEL = 200;
export const SEMIFINALS_level = 300;
export const FINALS_LEVEL = 400;

// Different Result Types
export const RESULT_NOT_PLAYED = -1;
export const RESULT_TIE = 0;
export const RESULT_RED_WIN = 1;
export const RESULT_BLUE_WIN = 2;
export const RESULT_GAME_SPECIFIC = 3;

export type Alliance = 'red' | 'blue';

export enum MatchState {
  MATCH_NOT_SELECTED = 0,
  PRESTART_READY = 1,
  PRESTART_COMPLETE = 2,
  AUDIENCE_READY = 3,
  FIELD_READY = 4,
  MATCH_READY = 5,
  MATCH_IN_PROGRESS = 6,
  MATCH_ABORTED = 7,
  MATCH_COMPLETE = 8,
  RESULTS_READY = 9,
  RESULTS_COMMITTED = 10,
  RESULTS_POSTED = 11
}

export interface MatchMakerParams {
  teamsParticipating: number;
  teamsPerAlliance: number;
  matchesPerTeam: number;
  fields: number;
  eventKey: string;
  tournamentKey: string;
  type: TournamentType;
  quality: string;
  teamKeys: number[];
}

export const isMatchMakerRequest = (obj: unknown): obj is MatchMakerParams =>
  isNonNullObject(obj) &&
  isNumber(obj.teamsParticipating) &&
  isNumber(obj.teamsPerAlliance) &&
  isNumber(obj.matchesPerTeam) &&
  isNumber(obj.fields) &&
  isString(obj.eventKey) &&
  isString(obj.type) &&
  isString(obj.quality) &&
  isArray(obj.teamKeys);

export interface Match<T extends MatchDetailBase> {
  eventKey: string;
  tournamentKey: string;
  id: number;
  name: string;
  scheduledTime: string;
  prestartTime: string;
  startTime: string;
  fieldNumber: number;
  cycleTime: number;
  redScore: number;
  redMinPen: number;
  redMajPen: number;
  blueScore: number;
  blueMinPen: number;
  blueMajPen: number;
  active: number;
  result: number;
  uploaded: number;
  participants?: MatchParticipant[];
  details?: T;
}

export const isMatch = (obj: unknown): obj is Match<any> =>
  isNonNullObject(obj) &&
  isString(obj.eventKey) &&
  isString(obj.tournamentKey) &&
  isNumber(obj.id) &&
  isString(obj.matchName);

export const isMatchArray = (obj: unknown): obj is Match<any>[] =>
  isArray(obj) && obj.every((o) => isMatch(o));

export interface MatchParticipant {
  eventKey: string;
  tournamentKey: string;
  id: number;
  teamKey: number;
  station: number;
  disqualified: number;
  cardStatus: number;
  surrogate: number;
  noShow: number;
  team?: Team;
}

export const isMatchParticipant = (obj: unknown): obj is MatchParticipant =>
  isNonNullObject(obj) &&
  isString(obj.eventKey) &&
  isString(obj.tournamentKey) &&
  isNumber(obj.id) &&
  isNumber(obj.teamKey) &&
  isNumber(obj.station);

export const isMatchParticipantArray = (
  obj: unknown
): obj is MatchParticipant[] =>
  isArray(obj) && obj.every((o) => isMatchParticipant(o));

export interface MatchDetailBase {
  eventKey: string;
  tournamentKey: string;
  id: number;
}

export const isMatchDetail = (obj: MatchDetailBase): obj is MatchDetailBase =>
  isNonNullObject(obj) &&
  isString(obj.eventKey) &&
  isString(obj.tournamentKey) &&
  isNumber(obj.id);

export function assignMatchTimes(
  matches: Match<any>[],
  items: ScheduleItem[]
): Match<any>[] {
  let matchNumber = 0;
  const newMatches: Match<any>[] = [];
  for (const item of items) {
    if (item.isMatch) {
      newMatches.push({ ...matches[matchNumber], startTime: item.startTime });
      matchNumber++;
    }
  }
  return newMatches;
}

export function createFixedMatches(
  items: ScheduleItem[],
  allianceMembers: AllianceMember[],
  matchMap: number[][]
): Match<any>[] {
  const matches: Match<any>[] = [];
  let matchNumber = 0;
  for (const item of items) {
    if (!item.isMatch) continue;
    const { eventKey, tournamentKey } = item;
    const match: Match<any> = {
      eventKey,
      tournamentKey,
      id: matchNumber,
      fieldNumber: 1,
      name: `${item.type} ${item.name}`,
      result: -1,
      active: 0,
      blueMajPen: 0,
      blueMinPen: 0,
      blueScore: 0,
      cycleTime: 0,
      prestartTime: '',
      redMajPen: 0,
      redMinPen: 0,
      redScore: 0,
      scheduledTime: item.startTime,
      startTime: item.startTime,
      uploaded: 0
    };
    const matchAllianceMap = matchMap[matchNumber];
    const redAlliance = allianceMembers.filter(
      (a) => a.allianceRank === matchAllianceMap[0]
    );
    const blueAlliance = allianceMembers.filter(
      (a) => a.allianceRank === matchAllianceMap[1]
    );
    const participants: MatchParticipant[] = [];
    for (const participant of redAlliance) {
      participants.push({
        eventKey,
        tournamentKey,
        id: matchNumber,
        teamKey: participant.teamKey,
        station: 10 + participants.length + 1,
        cardStatus: 0,
        disqualified: 0,
        noShow: 0,
        surrogate: 0
      });
    }

    for (const participant of blueAlliance) {
      participants.push({
        eventKey,
        tournamentKey,
        id: matchNumber,
        teamKey: participant.teamKey,
        station: 20 + participants.filter((p) => p.station >= 20).length + 1,
        cardStatus: 0,
        disqualified: 0,
        noShow: 0,
        surrogate: 0
      });
    }
    match.participants = participants;
    matches.push(match);
    matchNumber++;
  }
  return matches;
}

export function getTournamentLevelFromType(type: TournamentType) {
  switch (type) {
    case 'Test':
      return TEST_LEVEL;
    case 'Practice':
      return PRACTICE_LEVEL;
    case 'Qualification':
      return QUALIFICATION_LEVEL;
    case 'Ranking':
      return RANKING_LEVEL;
    case 'Round Robin':
      return ROUND_ROBIN_LEVEL;
    case 'Finals':
      return FINALS_LEVEL;
    default:
      return PRACTICE_LEVEL;
  }
}

export function reconcileMatchParticipants(
  matches: Match<any>[],
  participants: MatchParticipant[]
): Match<any>[] {
  const map: Map<number, MatchParticipant[]> = new Map();
  for (const participant of participants) {
    if (!map.get(participant.id)) {
      map.set(participant.id, []);
    }
    map.get(participant.id)?.push(participant);
  }

  const newMatches: Match<any>[] = [];

  for (const match of matches) {
    const newMatch = { ...match, participants: map.get(match.id) };
    newMatches.push(newMatch);
  }
  return newMatches;
}

export function reconcileMatchDetails<T extends MatchDetailBase>(
  matches: Match<T>[],
  details: T[]
): Match<T>[] {
  const map: Map<number, T> = new Map();
  for (const detail of details) {
    map.set(detail.id, detail);
  }

  const newMatches: Match<any>[] = [];

  for (const match of matches) {
    newMatches.push({ ...match, details: map.get(match.id) });
  }

  return newMatches;
}
