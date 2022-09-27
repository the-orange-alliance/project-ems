import { MatchDetailBase } from '../Match';
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

export function calculateScore(
  details: CarbonCaptureDetails
): [number, number] {
  const coopertition = details.coopertitionBonusLevel * 100;
  const redScore =
    (1 +
      getMultiplier(details.redRobotOneStorage) +
      getMultiplier(details.redRobotTwoStorage) +
      getMultiplier(details.redRobotThreeStorage)) *
      details.carbonPoints +
    coopertition;
  const blueScore =
    (1 +
      getMultiplier(details.blueRobotOneStorage) +
      getMultiplier(details.blueRobotTwoStorage) +
      getMultiplier(details.blueRobotThreeStorage)) *
      details.carbonPoints +
    coopertition;
  return [Math.ceil(redScore), Math.ceil(blueScore)];
}

function getMultiplier(robotStatus: number): number {
  switch (robotStatus) {
    case 0:
      return 0;
    case 1:
      return 0.25;
    case 2:
      return 0.5;
    case 3:
      return 0.75;
    case 4:
      return 1.0;
    default:
      return 0;
  }
}
