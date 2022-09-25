import { isMatchDetail, MatchDetailBase } from '../Match';
import { Ranking } from '../Ranking';
import { isNonNullObject, isNumber } from '../types';

export interface CarbonCaptureDetails extends MatchDetailBase {
  carbonPoints: number;
  redRobotOneStorage: number;
  redRobotTwoStorage: number;
  redRobotThreeStorage: number;
  blueRobotOneStorage: number;
  blueRobotTwoStorage: number;
  blueRobotThreeStorage: number;
  coopertitionBonusLevel: number;
}

export const isCarbonCaptureDetails = (
  obj: unknown
): obj is CarbonCaptureDetails =>
  isNonNullObject(obj) &&
  isNumber(obj.carbonPoints) &&
  isNumber(obj.redRobotOneStorage) &&
  isNumber(obj.redRobotTwoStorage) &&
  isNumber(obj.redRobotThreeStorage) &&
  isNumber(obj.blueRobotOneStorage) &&
  isNumber(obj.blueRobotTwoStorage) &&
  isNumber(obj.blueRobotThreeStorage) &&
  isNumber(obj.coopertitionBonusLevel);

export interface CarbonCaptureRanking extends Ranking {
  rankingScore: number;
  carbonPoints: number;
}

export const isCarbonCaptureRanking = (
  obj: unknown
): obj is CarbonCaptureRanking =>
  isNonNullObject(obj) &&
  isNumber(obj.rankingScore) &&
  isNumber(obj.carbonPoints);
