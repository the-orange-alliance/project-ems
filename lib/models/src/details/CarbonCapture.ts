import { Match, MatchDetailBase } from '../Match.js';
import { Ranking } from '../Ranking.js';
import { isNonNullObject, isNumber } from '../types.js';

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

export const defaultCarbonCaptureDetails: CarbonCaptureDetails = {
  matchKey: '',
  matchDetailKey: '',
  carbonPoints: 0,
  redRobotOneStorage: 0,
  redRobotTwoStorage: 0,
  redRobotThreeStorage: 0,
  blueRobotOneStorage: 0,
  blueRobotTwoStorage: 0,
  blueRobotThreeStorage: 0,
  coopertitionBonusLevel: 0
};

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
  highestScore: number;
  carbonPoints: number;
}

export const isCarbonCaptureRanking = (
  obj: unknown
): obj is CarbonCaptureRanking =>
  isNonNullObject(obj) &&
  isNumber(obj.rankingScore) &&
  isNumber(obj.carbonPoints);

export function calculateRankings(
  matches: Match[],
  prevRankings: CarbonCaptureRanking[]
): CarbonCaptureRanking[] {
  const rankingMap: Map<number, CarbonCaptureRanking> = new Map();
  const scoresMap: Map<number, number[]> = new Map();

  // In this loop calculate basic W-L-T, as well as basic game information
  for (const match of matches) {
    if (!match.participants) break;
    for (const participant of match.participants) {
      if (!rankingMap.get(participant.teamKey)) {
        rankingMap.set(participant.teamKey, {
          tournamentLevel: match.tournamentLevel,
          allianceKey: '',
          carbonPoints: 0,
          losses: 0,
          played: 0,
          rank: 0,
          rankChange: 0,
          rankingScore: 0,
          rankKey: '',
          teamKey: participant.teamKey,
          ties: 0,
          wins: 0,
          highestScore: 0
        });
      }

      if (!scoresMap.get(participant.teamKey)) {
        scoresMap.set(participant.teamKey, []);
      }

      if (
        !isCarbonCaptureDetails(match.details) ||
        participant.disqualified === 1
      ) {
        continue;
      }

      const ranking = {
        ...(rankingMap.get(participant.teamKey) as CarbonCaptureRanking)
      };
      const scores = scoresMap.get(participant.teamKey) as number[];
      const redWin = match.redScore > match.blueScore;
      const isTie = match.redScore === match.blueScore;

      if (participant.station < 20) {
        // Red Alliance
        scoresMap.set(participant.teamKey, [...scores, match.redScore]);
        ranking.wins = ranking.wins + (redWin ? 1 : 0);
        ranking.losses = ranking.losses + (redWin ? 0 : 1);
        ranking.ties = ranking.ties + (isTie ? 1 : 0);
        if (ranking.highestScore < match.redScore) {
          ranking.highestScore = match.redScore;
        }
      }

      if (participant.station >= 20) {
        // Blue Alliance
        scoresMap.set(participant.teamKey, [...scores, match.blueScore]);
        ranking.wins = ranking.wins + (redWin ? 0 : 1);
        ranking.losses = ranking.losses + (redWin ? 1 : 0);
        ranking.ties = ranking.ties + (isTie ? 1 : 0);
        if (ranking.highestScore < match.blueScore) {
          ranking.highestScore = match.blueScore;
        }
      }
      if (participant.disqualified === 1) continue;
      ranking.played = ranking.played + 1;
      ranking.carbonPoints = ranking.carbonPoints + match.details.carbonPoints;
      rankingMap.set(participant.teamKey, ranking);
    }
  }

  // In this loop, calculate ranking score
  for (const key of rankingMap.keys()) {
    const scores = scoresMap.get(key);
    if (!scores) continue;
    const ranking = {
      ...rankingMap.get(key)
    } as CarbonCaptureRanking;
    const lowestScore = ranking.played > 0 ? Math.min(...scores) : 0;
    const index = scores.findIndex((s) => s === lowestScore);
    const newScores =
      scores.length > 1
        ? [...scores.splice(0, index), ...scores.splice(index + 1)]
        : scores;
    if (newScores.length > 0) {
      ranking.rankingScore =
        newScores.reduce((prev, curr) => prev + curr) / newScores.length;
    } else {
      ranking.rankingScore = 0;
    }
    rankingMap.set(key, ranking);
  }

  // In this loop calculate team rankings
  const rankings = [...rankingMap.values()].sort(compareRankings);

  // In this loop calculate the rank change
  for (let i = 0; i < rankings.length; i++) {
    const prevRanking = prevRankings.find(
      (r) => r.teamKey === rankings[i].teamKey
    );
    rankings[i].rank = i + 1;
    if (prevRanking) {
      const rankDelta =
        prevRanking.rank === 0 ? 0 : prevRanking.rank - rankings[i].rank;
      rankings[i].rankChange = rankDelta;
      rankings[i].rankKey = prevRanking.rankKey;
    }
  }

  return rankings;
}

// TODO - calculate penalties
export function calculateScore(
  redPen: number,
  bluePen: number,
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
  return [
    Math.ceil(redScore * (1 - redPen * 0.1)),
    Math.ceil(blueScore * (1 - bluePen * 0.1))
  ];
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

function compareRankings(
  a: CarbonCaptureRanking,
  b: CarbonCaptureRanking
): number {
  if (a.rankingScore > b.rankingScore) {
    return -1;
  } else if (a.highestScore > b.highestScore) {
    return -1;
  } else if (a.carbonPoints > b.carbonPoints) {
    return -1;
  }
  return 1;
}
