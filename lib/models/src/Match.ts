import { DateTime } from 'luxon';
import { AllianceMember } from './Alliance.js';
import { CarbonCaptureDetails } from './details/index.js';
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
  team?: Team;
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
      matchNumber++;
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

  const sortedMatches = newMatches.sort((a, b) =>
    DateTime.fromISO(a.startTime) > DateTime.fromISO(b.startTime) ? 1 : -1
  );

  let shouldSwitch = false;
  for (let i = 0; i < sortedMatches.length; i++) {
    const name = sortedMatches[i].matchName;
    const fields = name.split(' ');
    sortedMatches[i].matchName =
      name.substring(0, name.length - fields[fields.length - 1].length - 1) +
      ' ' +
      (i + 1);

    if (i % 3 === 0) {
      sortedMatches[i].fieldNumber = 5;
      if (shouldSwitch) {
        shouldSwitch = false;
      } else {
        shouldSwitch = true;
      }
    } else {
      const number = shouldSwitch ? i % 3 : (i % 3) + 2;
      sortedMatches[i].fieldNumber = number;
    }
    if (sortedMatches[i].fieldNumber === 2) {
      sortedMatches[i].fieldNumber = 3;
    } else if (sortedMatches[i].fieldNumber === 3) {
      sortedMatches[i].fieldNumber = 2;
    }
  }

  return newMatches;
}

export function createFixedMatches(
  items: ScheduleItem[],
  allianceMembers: AllianceMember[],
  matchMap: number[][],
  eventKey: string
): Match[] {
  const matches: Match[] = [];
  let matchNumber = 0;
  for (const item of items) {
    if (!item.isMatch) continue;
    const matchKey = `${eventKey}-${getMatchKeyPartialFromType(item.type)}${(
      matchNumber + 1
    )
      .toString()
      .padStart(3, '0')}`;

    const match: Match = {
      fieldNumber: 5,
      matchKey,
      matchDetailKey: matchKey + 'D',
      matchName: `${item.type} ${item.name}`,
      result: -1,
      tournamentLevel: getTournamentLevelFromType(item.type),
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
        matchKey,
        matchParticipantKey: `${matchKey}-T${participants.length + 1}`,
        teamKey: participant.teamKey,
        station: 10 + participants.length + 1,
        allianceKey: participant.allianceKey,
        cardStatus: 0,
        disqualified: 0,
        noShow: 0,
        surrogate: 0
      });
    }

    for (const participant of blueAlliance) {
      participants.push({
        matchKey,
        matchParticipantKey: `${matchKey}-T${participants.length + 1}`,
        teamKey: participant.teamKey,
        station: 20 + participants.length + 1,
        allianceKey: participant.allianceKey,
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

export function getMatchKeyPartialFromType(type: TournamentType) {
  switch (type) {
    case 'Test':
      return 'T';
    case 'Practice':
      return 'P';
    case 'Qualification':
      return 'Q';
    case 'Ranking':
      return 'R';
    case 'Round Robin':
      return 'B';
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
      return RANKING_LEVEL;
    case 'Round Robin':
      return ROUND_ROBIN_LEVEL;
    case 'Finals':
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

export function reconcileMatchDetails(
  matches: Match[],
  details: MatchDetails[]
): Match[] {
  const map: Map<string, MatchDetails> = new Map();
  for (const detail of details) {
    map.set(detail.matchKey, detail);
  }

  const newMatches: Match[] = [];

  for (const match of matches) {
    newMatches.push({ ...match, details: map.get(match.matchKey) });
  }

  return newMatches;
}
