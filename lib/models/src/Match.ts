import { CarbonCaptureDetails } from './details';
import { EventSchedule, ScheduleItem, TournamentType } from './Schedule';
import { isArray, isNonNullObject, isNumber, isString } from './types';

// Tournament Levels
export const TEST_LEVEL = -1;
export const PRACTICE_LEVEL = 0;
export const QUALIFICATION_LEVEL = 1;
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

export enum MatchState {
  MATCH_NOT_SELECTED = 0,
  PRESTART_READY = 1,
  PRESTART_COMPLETE = 2,
  FIELD_READY = 3,
  MATCH_READY = 4,
  MATCH_IN_PROGRESS = 5,
  MATCH_ABORTED = 6,
  MATCH_COMPLETE = 7,
  RESULTS_READY = 8,
  RESULTS_COMMITTED = 9,
  RESULTS_POSTED = 10
}

export interface MatchMakerParams {
  teamsParticipating: number;
  teamsPerAlliance: number;
  matchesPerTeam: number;
  fields: number;
  eventKey: string;
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

export interface Match {
  matchKey: string;
  matchDetailKey: string;
  matchName: string;
  tournamentLevel: number;
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
  details?: MatchDetails;
}

export const isMatch = (obj: unknown): obj is Match =>
  isNonNullObject(obj) &&
  isString(obj.matchKey) &&
  isString(obj.matchDetailKey) &&
  isString(obj.matchName);

export const isMatchArray = (obj: unknown): obj is Match[] =>
  isArray(obj) && obj.every((o) => isMatch(o));

export interface MatchParticipant {
  matchParticipantKey: string;
  matchKey: string;
  teamKey: number;
  station: number;
  disqualified: number;
  cardStatus: number;
  surrogate: number;
  noShow: number;
  allianceKey: string;
}

export const isMatchParticipant = (obj: unknown): obj is MatchParticipant =>
  isNonNullObject(obj) &&
  isString(obj.matchKey) &&
  isNumber(obj.teamKey) &&
  isNumber(obj.station);

export const isMatchParticipantArray = (
  obj: unknown
): obj is MatchParticipant[] =>
  isArray(obj) && obj.every((o) => isMatchParticipant(o));

export interface MatchDetailBase {
  matchDetailKey: string;
  matchKey: string;
}

export const isMatchDetail = (obj: MatchDetailBase): obj is MatchDetailBase =>
  isNonNullObject(obj) &&
  isString(obj.matchDetailKey) &&
  isString(obj.matchKey);

export type MatchDetails = MatchDetailBase | CarbonCaptureDetails;

export function assignMatchTimes(
  matches: Match[],
  items: ScheduleItem[]
): Match[] {
  let matchNumber = 0;
  const newMatches: Match[] = [];
  for (const item of items) {
    if (item.isMatch) {
      newMatches.push({ ...matches[matchNumber], startTime: item.startTime });
    }
  }
  return newMatches;
}

export function assignMatchFieldsForFGC(
  matches: Match[],
  items: ScheduleItem[],
  schedule: EventSchedule
): Match[] {
  let matchNumber = 0;
  let fieldIndex = 0;
  let index = 0;
  const newMatches: Match[] = [];
  for (const item of items) {
    // This is assuming scheduleItems and matchList have the same lengths...
    if (item.isMatch) {
      const newMatch: Match = Object.assign({}, matches[matchNumber]);
      newMatch.startTime = item.startTime;
      // TODO - Only a FIRST Global thing.
      if (
        item.day + 1 === schedule.days.length &&
        schedule.type === 'Qualification'
      ) {
        // This is the last day. Only use fields 3, 4, and 5.
        newMatch.fieldNumber = index + 3;
        index++;
        if (index % 3 === 0) {
          index = 0;
        }
      } else {
        // TODO - ONLY A FIRST GLOBAL THING.
        if (item.duration === 7) {
          newMatch.fieldNumber = 5; // Premiere field.
        } else {
          if (fieldIndex >= 4) {
            fieldIndex = 1;
          } else {
            fieldIndex++;
          }
          if (fieldIndex === 1) {
            newMatch.fieldNumber = 1; // Normal field.
          }
          if (fieldIndex === 2) {
            newMatch.fieldNumber = 4; // Normal field.
          }
          if (fieldIndex === 3) {
            newMatch.fieldNumber = 2; // Normal field.
          }
          if (fieldIndex === 4) {
            newMatch.fieldNumber = 3; // Normal field.
          }
        }
      }
      matchNumber++;
      newMatches.push(newMatch);
    } else if (item.isMatch) {
      const newMatch: Match = Object.assign({}, matches[matchNumber]);

      if (fieldIndex >= 4) {
        fieldIndex = 1;
      } else {
        fieldIndex++;
      }

      newMatch.startTime = item.startTime;

      if (fieldIndex === 1) {
        newMatch.fieldNumber = 1; // Normal field.
      }
      if (fieldIndex === 2) {
        newMatch.fieldNumber = 4; // Normal field.
      }
      if (fieldIndex === 3) {
        newMatch.fieldNumber = 2; // Normal field.
      }
      if (fieldIndex === 4) {
        newMatch.fieldNumber = 3; // Normal field.
      }
      newMatches.push(newMatch);
      matchNumber++;
    }
  }
  return newMatches;
}

export function getMatchKeyPartialFromType(type: TournamentType) {
  switch (type) {
    case 'Practice':
      return 'P';
    case 'Qualification':
      return 'Q';
    case 'Ranking':
      return 'E';
    default:
      return 'P';
  }
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
      return FINALS_LEVEL;
    default:
      return PRACTICE_LEVEL;
  }
}

export function getMatchKeyPartialFromKey(matchKey: string) {
  return matchKey.substring(0, matchKey.length - 3);
}

export function reconcileMatchParticipants(
  matches: Match[],
  participants: MatchParticipant[]
): Match[] {
  const map: Map<string, MatchParticipant[]> = new Map();
  for (const participant of participants) {
    if (!map.get(participant.matchKey)) {
      map.set(participant.matchKey, []);
    }
    map.get(participant.matchKey)?.push(participant);
  }

  const newMatches: Match[] = [];

  for (const match of matches) {
    const newMatch = { ...match, participants: map.get(match.matchKey) };
    newMatches.push(newMatch);
  }
  return newMatches;
}
