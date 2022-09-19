import { TournamentType } from './Schedule';
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
  details?: MatchDetailBase;
}

export const isMatch = (obj: unknown): obj is Match =>
  isNonNullObject(obj) &&
  isString(obj.matchKey) &&
  isString(obj.matchDetailKey) &&
  isString(obj.matchName);

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

export interface MatchDetailBase {
  matchDetailKey: string;
  matchKey: string;
}
