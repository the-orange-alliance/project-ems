import { AllianceMember } from '../base/Alliance.js';
import { Match, MatchDetailBase } from '../base/Match.js';
import { Ranking } from '../base/Ranking.js';
import { isNonNullObject, isNumber } from '../types.js';
import { Season, SeasonFunctions } from './index.js';

/**
 * Main season function declaration for the whole file.
 */
const functions: SeasonFunctions<CarbonCaptureDetails, CarbonCaptureRanking> = {
  calculateRankings,
  calculateScore
};

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
  eventKey: '',
  tournamentKey: '',
  id: -1,
  carbonPoints: 0,
  redRobotOneStorage: 0,
  redRobotTwoStorage: 0,
  redRobotThreeStorage: 0,
  blueRobotOneStorage: 0,
  blueRobotTwoStorage: 0,
  blueRobotThreeStorage: 0,
  coopertitionBonusLevel: 0
};

export const CarbonCaptureSeason: Season<
  CarbonCaptureDetails,
  CarbonCaptureRanking
> = {
  key: 'fgc_2022',
  program: 'fgc',
  name: 'Carbon Capture',
  defaultMatchDetails: defaultCarbonCaptureDetails,
  functions
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

function calculateRankings(
  matches: Match<CarbonCaptureDetails>[],
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
          eventKey: participant.eventKey,
          tournamentKey: participant.tournamentKey,
          carbonPoints: 0,
          losses: 0,
          played: 0,
          rank: 0,
          rankChange: 0,
          rankingScore: 0,
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
        participant.disqualified === 1 ||
        participant.surrogate > 0
      ) {
        continue;
      }

      const ranking = {
        ...(rankingMap.get(participant.teamKey) as CarbonCaptureRanking)
      };
      const scores = scoresMap.get(participant.teamKey) as number[];
      const redWin = match.redScore > match.blueScore;
      const blueWin = match.blueScore > match.redScore;
      const isTie = match.redScore === match.blueScore;

      if (participant.station < 20) {
        // Red Alliance
        if (participant.cardStatus === 2) {
          scoresMap.set(participant.teamKey, [...scores, match.redScore]);
          ranking.losses = ranking.losses + 1;
        } else {
          scoresMap.set(participant.teamKey, [...scores, match.redScore]);
          ranking.wins = ranking.wins + (redWin ? 1 : 0);
          ranking.losses = ranking.losses + (redWin ? 0 : 1);
          ranking.ties = ranking.ties + (isTie ? 1 : 0);
          if (ranking.highestScore < match.redScore) {
            ranking.highestScore = match.redScore;
          }
        }
      }

      if (participant.station >= 20) {
        // Blue Alliance
        if (participant.cardStatus === 2) {
          scoresMap.set(participant.teamKey, [...scores, match.blueScore]);
          ranking.losses = ranking.losses + 1;
        } else {
          scoresMap.set(participant.teamKey, [...scores, match.blueScore]);
          ranking.wins = ranking.wins + (blueWin ? 1 : 0);
          ranking.losses = ranking.losses + (blueWin ? 0 : 1);
          ranking.ties = ranking.ties + (isTie ? 1 : 0);
          if (ranking.highestScore < match.blueScore) {
            ranking.highestScore = match.blueScore;
          }
        }
      }
      if (participant.cardStatus < 2) {
        ranking.carbonPoints =
          ranking.carbonPoints + match.details.carbonPoints;
      }
      ranking.played = ranking.played + 1;
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
        ? [...scores.slice(0, index), ...scores.slice(index + 1)]
        : scores;
    if (newScores.length > 0) {
      ranking.rankingScore = Math.ceil(
        newScores.reduce((prev, curr) => prev + curr) / newScores.length
      );
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
      rankings[i].eventKey = prevRanking.eventKey;
      rankings[i].tournamentKey = prevRanking.tournamentKey;
    }
  }

  return rankings;
}

export function calculatePlayoffsRank(
  matches: Match<CarbonCaptureDetails>[],
  prevRankings: CarbonCaptureRanking[],
  members: AllianceMember[]
) {
  const alliances: Map<number, CarbonCaptureRanking> = new Map();
  const rankingMap: Map<number, CarbonCaptureRanking> = new Map();

  for (const match of matches) {
    if (!match.participants) break;
    for (const participant of match.participants) {
      if (!rankingMap.get(participant.teamKey)) {
        rankingMap.set(participant.teamKey, {
          eventKey: participant.eventKey,
          tournamentKey: participant.tournamentKey,
          carbonPoints: 0,
          losses: 0,
          played: 0,
          rank: 0,
          rankChange: 0,
          rankingScore: 0,
          teamKey: participant.teamKey,
          ties: 0,
          wins: 0,
          highestScore: 0
        });
      }

      if (!isCarbonCaptureDetails(match.details)) continue;

      const ranking = {
        ...(rankingMap.get(participant.teamKey) as CarbonCaptureRanking)
      };

      if (participant.cardStatus === 2) {
        rankingMap.set(participant.teamKey, ranking);
        continue;
      }

      if (participant.station < 20) {
        ranking.rankingScore += match.redScore;
      } else if (participant.station >= 20) {
        ranking.rankingScore += match.blueScore;
      }

      ranking.played += 1;
      rankingMap.set(participant.teamKey, ranking);
    }
  }

  const rankings = [...rankingMap.values()].sort(
    (a, b) => b.rankingScore - a.rankingScore
  );
  const rankedMembers = [...rankings].map((r) =>
    members.find((m) => m.teamKey === r.teamKey)
  );

  const allianceRankMap: Map<number, number> = new Map();
  let allianceRank = 1;
  rankedMembers.forEach((m, i) => {
    if (m?.isCaptain) {
      allianceRankMap.set(m.allianceRank, allianceRank);
      allianceRank += 1;
    }
  });

  for (let i = 0; i < rankings.length; i++) {
    const member = rankedMembers[i];
    const prevRanking = prevRankings.find(
      (r) => r.teamKey === rankings[i].teamKey
    );
    if (prevRanking && member) {
      rankings[i].rank = allianceRankMap.get(member.allianceRank) || 0;
      const rankDelta =
        prevRanking.rank === 0 ? 0 : prevRanking.rank - rankings[i].rank;
      rankings[i].rankChange = rankDelta;
      rankings[i].eventKey = prevRanking.eventKey;
      rankings[i].tournamentKey = prevRanking.tournamentKey;
    }
  }
  return rankings;
}

// TODO - calculate penalties
export function calculateScore(
  match: Match<CarbonCaptureDetails>
): [number, number] {
  const { details } = match;
  if (!details) return [0, 0];
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
    Math.ceil(redScore * (1 - match.redMinPen * 0.1)),
    Math.ceil(blueScore * (1 - match.blueMinPen * 0.1))
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
  if (a.rankingScore !== b.rankingScore) {
    return b.rankingScore - a.rankingScore;
  } else if (a.highestScore !== b.highestScore) {
    return b.highestScore - a.highestScore;
  } else if (a.carbonPoints !== b.carbonPoints) {
    return b.carbonPoints - a.carbonPoints;
  } else {
    return 0;
  }
}
