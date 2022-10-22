import { MatchDetailBase } from '../Match.js';
import { Ranking } from '../Ranking.js';
import { isNonNullObject, isNumber } from '../types.js';

export interface PowerPlayDetails extends MatchDetailBase {
  redJunctions: number;
  redLowJunctions: number;
  redMidJunctions: number;
  redHighJunctions: number;
  blueJunctions: number;
  blueLowJunctions: number;
  blueMidJunctions: number;
  blueHighJunctions: number;
}

export interface PowerPlayRanking extends Ranking {
  rankingScore: number;
  totalJunctions: number;
}

export const isPowerPlayDetails = (obj: unknown): obj is PowerPlayDetails =>
  isNonNullObject(obj) &&
  isNumber(obj.redJunctions) &&
  isNumber(obj.blueJunctions);

export const isPowerPlayRanking = (obj: unknown): obj is PowerPlayRanking =>
  isNonNullObject(obj) &&
  isNumber(obj.rankingScore) &&
  isNumber(obj.totalJunctions);
