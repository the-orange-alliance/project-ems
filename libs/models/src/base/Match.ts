import { AllianceMember } from './Alliance.js';
import { ScheduleItem, TournamentType } from './Schedule.js';
import { teamZod } from './Team.js';
import { z } from 'zod';

// Match Levels
export const TEST_LEVEL = 0;
export const PRACTICE_LEVEL = 1;
export const QUALIFICATION_LEVEL = 2;
export const ROUND_ROBIN_LEVEL = 20;
export const RANKING_LEVEL = 30;
export const OCTOFINALS_LEVEL = 100;
export const QUARTERFINALS_LEVEL = 200;
export const SEMIFINALS_LEVEL = 300;
export const FINALS_LEVEL = 400;

// Different Result Types
export const RESULT_NOT_PLAYED = -1;
export const RESULT_TIE = 0;
export const RESULT_RED_WIN = 1;
export const RESULT_BLUE_WIN = 2;
export const RESULT_GAME_SPECIFIC = 3;

export type Alliance = 'red' | 'blue';

export const RED_STATION = 10;
export const BLUE_STATION = 20;

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

export enum MatchSocketEvent {
  ALLIANCE = 'match:alliance',
  COMMIT = 'match:commit',
  DISPLAY = 'match:display',
  UPDATE = 'match:update',
  MATCH_UPDATE_ITEM = 'match:updateItem',
  MATCH_UPDATE_DETAILS_ITEM = 'match:updateDetailsItem',
  MATCH_ADJUST_DETAILS_NUMBER = 'match:adjustDetailsNumber',
  UPDATE_CARD_STATUS = 'match:updateCardStatus',

  PRESTART = 'match:prestart',
  START = 'match:start',
  AUTONOMOUS = 'match:auto',
  TELEOPERATED = 'match:tele',
  ENDGAME = 'match:endgame',
  END = 'match:end',
  ABORT = 'match:abort',

  BONUS_START = 'match:bonusStart',
  BONUS_END = 'match:bonusEnd'
}

export const matchMakerParamsZod = z.object({
  teamsParticipating: z.number(),
  teamsPerAlliance: z.number(),
  matchesPerTeam: z.number(),
  fields: z.number(),
  eventKey: z.string(),
  tournamentKey: z.string(),
  name: z.string(),
  quality: z.string(),
  teamKeys: z.array(z.number())
});

export const matchKeyZod = z
  .object({
    eventKey: z.string(),
    tournamentKey: z.string(),
    id: z.number()
  })
  .extend({});

export const matchParticipantZod = z.object({
  eventKey: z.string(),
  tournamentKey: z.string(),
  id: z.number(),
  teamKey: z.number(),
  station: z.number(),
  disqualified: z.number(),
  cardStatus: z.number(),
  surrogate: z.number(),
  noShow: z.number(),
  team: z.optional(teamZod)
});

export type Match<T extends MatchDetailBase> = {
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
};

export const matchZod: z.ZodSchema<Match<MatchDetailBase>> = z.object({
  eventKey: z.string(),
  tournamentKey: z.string(),
  id: z.number(),
  fieldNumber: z.number(),
  name: z.string(),
  scheduledTime: z.string(),
  prestartTime: z.string(),
  startTime: z.string(),
  cycleTime: z.number(),
  redScore: z.number(),
  redMinPen: z.number(),
  redMajPen: z.number(),
  blueScore: z.number(),
  blueMinPen: z.number(),
  blueMajPen: z.number(),
  active: z.number(),
  result: z.number(),
  uploaded: z.number(),
  participants: z.array(matchParticipantZod).optional(),
  details: matchKeyZod.optional()
});

// @ts-expect-error It's an object, who cares?
export const matchWithDetailsZod = matchZod.extend({
  details: z.union([matchKeyZod, z.any()]).optional()
});

export type MatchMakerParams = z.infer<typeof matchMakerParamsZod>;
export type MatchKey = z.infer<typeof matchKeyZod>;
export type MatchDetailBase = z.infer<typeof matchKeyZod>;
export type MatchParticipant = z.infer<typeof matchParticipantZod>;

export function assignMatchTimes(
  matches: Match<MatchDetailBase>[],
  items: ScheduleItem[]
): Match<MatchDetailBase>[] {
  let matchNumber = 0;
  const newMatches: Match<MatchDetailBase>[] = [];
  for (const item of items) {
    if (item.isMatch) {
      newMatches.push({
        ...matches[matchNumber],
        scheduledTime: item.startTime
      });
      matchNumber++;
    }
  }
  return newMatches;
}

export function createFixedMatches(
  items: ScheduleItem[],
  allianceMembers: AllianceMember[],
  matchMap: number[][]
): Match<MatchDetailBase>[] {
  const matches: Match<MatchDetailBase>[] = [];
  let matchNumber = 0;
  for (const item of items) {
    if (!item.isMatch) continue;
    const { eventKey, tournamentKey } = item;
    const match: Match<MatchDetailBase> = {
      eventKey,
      tournamentKey,
      id: matchNumber + 1,
      fieldNumber: 1,
      name: item.name,
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
        id: matchNumber + 1,
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
        id: matchNumber + 1,
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
      // TODO: Handle "Eliminations" case
      // throw new UnreachableError(type);
      return PRACTICE_LEVEL;
  }
}

export function reconcileMatchParticipants(
  matches: Match<MatchDetailBase>[],
  participants: MatchParticipant[]
): Match<MatchDetailBase>[] {
  const map: Map<string, MatchParticipant[]> = new Map();
  for (const participant of participants) {
    if (
      !map.get(
        `${participant.eventKey}-${participant.tournamentKey}-${participant.id}`
      )
    ) {
      map.set(
        `${participant.eventKey}-${participant.tournamentKey}-${participant.id}`,
        []
      );
    }
    map
      .get(
        `${participant.eventKey}-${participant.tournamentKey}-${participant.id}`
      )
      ?.push(participant);
  }

  const newMatches: Match<MatchDetailBase>[] = [];

  for (const match of matches) {
    const newMatch = {
      ...match,
      participants: map.get(
        `${match.eventKey}-${match.tournamentKey}-${match.id}`
      )
    };
    newMatches.push(newMatch);
  }
  return newMatches;
}

export function reconcileMatchDetails<T extends MatchDetailBase>(
  matches: Match<MatchDetailBase>[],
  details: T[]
): Match<MatchDetailBase>[] {
  const map: Map<string, T> = new Map();
  for (const detail of details) {
    map.set(`${detail.eventKey}-${detail.tournamentKey}-${detail.id}`, detail);
  }

  const newMatches: Match<MatchDetailBase>[] = [];

  for (const match of matches) {
    newMatches.push({
      ...match,
      details: map.get(`${match.eventKey}-${match.tournamentKey}-${match.id}`)
    });
  }

  return newMatches;
}

function getMatchKey(
  key: Match<MatchDetailBase> | MatchKey | MatchParticipant
): MatchKey {
  return {
    eventKey: key.eventKey,
    tournamentKey: key.tournamentKey,
    id: key.id
  };
}

export interface ItemUpdate {
  key: string;
  value: any;
}

export interface NumberAdjustment {
  key: string;
  adjustment: number;
}

export interface CardStatusUpdate {
  teamKey: number;
  cardStatus: number;
}
