import { isNonNullObject, isNumber, isString } from './types';

export interface Ranking {
  rankKey: number;
  teamKey: number;
  rank: number;
  rankChange: number;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  allianceKey: string;
}

export const isRanking = (obj: unknown): obj is Ranking =>
  isNonNullObject(obj) &&
  isNumber(obj.rankKey) &&
  isNumber(obj.teamKey) &&
  isNumber(obj.rank) &&
  isNumber(obj.rankChange) &&
  isNumber(obj.played) &&
  isNumber(obj.wins) &&
  isNumber(obj.losses) &&
  isNumber(obj.ties) &&
  isString(obj.allianceKey);
