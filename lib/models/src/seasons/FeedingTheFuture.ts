import { AllianceMember } from '../base/Alliance.js';
import { Match, MatchDetailBase } from '../base/Match.js';
import { Ranking } from '../base/Ranking.js';
import { isNonNullObject, isNumber } from '../types.js';
import { Season, SeasonFunctions } from './index.js';

export enum CardStatus {
  WHITE_CARD = 3,
  RED_CARD = 2,
  YELLOW_CARD = 1,
  NO_CARD = 0
}

/**
 * Score Table
 * Final score is ((WaterConserved + EnergyConserved + FoodProduced) * BalanceMultiplier) + FoodSecured + Coopertition
 */
export const ScoreTable = {
  Conserved: 1,
  FoodProduced: 2,
  FoodSecured: 2,
  BalanceMultiplier: (nBalanced: number) => 1 + nBalanced * 0.2,
  Coopertition: (nBalanced: number) =>
    nBalanced < 5 ? 0 : nBalanced >= 6 ? 30 : 15,
  Foul: 0.1 // Needs to be applied to other alliance to be calculated properly
};

/**
 * Main season function declaration for the whole file.
 */
const functions: SeasonFunctions<MatchDetails, SeasonRanking> = {
  calculateRankings,
  calculatePlayoffsRankings,
  calculateScore
};

export interface MatchDetails extends MatchDetailBase {
  redResevoirConserved: number;
  redNexusConserved: number;
  redFoodProduced: number;
  redFoodSecured: number;
  redRobotOneBalanced: number;
  redRobotTwoBalanced: number;
  redRobotThreeBalanced: number;
  blueResevoirConserved: number;
  blueNexusConserved: number;
  blueFoodProduced: number;
  blueFoodSecured: number;
  blueRobotOneBalanced: number;
  blueRobotTwoBalanced: number;
  blueRobotThreeBalanced: number;
  coopertition: number;
}

export const defaultMatchDetails: MatchDetails = {
  eventKey: '',
  id: -1,
  tournamentKey: '',
  redResevoirConserved: 0,
  redNexusConserved: 0,
  redFoodProduced: 0,
  redFoodSecured: 0,
  redRobotOneBalanced: 0,
  redRobotTwoBalanced: 0,
  redRobotThreeBalanced: 0,
  blueResevoirConserved: 0,
  blueNexusConserved: 0,
  blueFoodProduced: 0,
  blueFoodSecured: 0,
  blueRobotOneBalanced: 0,
  blueRobotTwoBalanced: 0,
  blueRobotThreeBalanced: 0,
  coopertition: 0
};

export const isFeedingTheFutureDetails = (obj: unknown): obj is MatchDetails =>
  isNonNullObject(obj) &&
  isNumber(obj.redResevoirConserved) &&
  isNumber(obj.blueResevoirConserved);

export interface SeasonRanking extends Ranking {
  rankingScore: number;
  highestScore: number;
  foodSecuredPoints: number;
}

export const FeedingTheFutureSeason: Season<MatchDetails, SeasonRanking> = {
  key: 'fgc_2024',
  program: 'fgc',
  name: 'Feeding The Future',
  defaultMatchDetails,
  functions
};

/* Functions for calculating ranks. */
function calculateRankings(
  matches: Match<MatchDetails>[],
  prevRankings: SeasonRanking[]
): SeasonRanking[] {
  const rankingMap: Map<number, SeasonRanking> = new Map();
  const scoresMap: Map<number, number[]> = new Map();

  // In this loop calculate basic W-L-T, as well as basic game information
  for (const match of matches) {
    if (!match.participants) break;
    for (const participant of match.participants) {
      if (!rankingMap.get(participant.teamKey)) {
        rankingMap.set(participant.teamKey, {
          eventKey: participant.eventKey,
          tournamentKey: participant.tournamentKey,
          foodSecuredPoints: 0,
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
        !isFeedingTheFutureDetails(match.details) ||
        participant.disqualified === 1 ||
        participant.surrogate > 0
      ) {
        continue;
      }

      const ranking = {
        ...(rankingMap.get(participant.teamKey) as SeasonRanking)
      };
      const scores = scoresMap.get(participant.teamKey) as number[];
      const redWin = match.redScore > match.blueScore;
      const blueWin = match.blueScore > match.redScore;
      const isTie = match.redScore === match.blueScore;

      if (participant.station < 20) {
        // Red Alliance
        if (
          participant.cardStatus === CardStatus.RED_CARD ||
          participant.noShow === CardStatus.YELLOW_CARD
        ) {
          scoresMap.set(participant.teamKey, [...scores, 0]);
          ranking.losses = ranking.losses + 1;
        } else {
          scoresMap.set(participant.teamKey, [...scores, match.redScore]);
          ranking.wins = ranking.wins + (redWin ? 1 : 0);
          ranking.losses = ranking.losses + (redWin ? 0 : 1);
          ranking.ties = ranking.ties + (isTie ? 1 : 0);
          ranking.foodSecuredPoints +=
            match.details.redFoodSecured * ScoreTable.FoodSecured;
          if (ranking.highestScore < match.redScore) {
            ranking.highestScore = match.redScore;
          }
        }
      }

      if (participant.station >= 20) {
        // Blue Alliance
        if (
          participant.cardStatus === CardStatus.RED_CARD ||
          participant.noShow === CardStatus.YELLOW_CARD
        ) {
          scoresMap.set(participant.teamKey, [...scores, 0]);
          ranking.losses = ranking.losses + 1;
        } else {
          scoresMap.set(participant.teamKey, [...scores, match.blueScore]);
          ranking.wins = ranking.wins + (blueWin ? 1 : 0);
          ranking.losses = ranking.losses + (blueWin ? 0 : 1);
          ranking.ties = ranking.ties + (isTie ? 1 : 0);
          ranking.foodSecuredPoints +=
            match.details.blueFoodSecured * ScoreTable.FoodSecured;
          if (ranking.highestScore < match.blueScore) {
            ranking.highestScore = match.blueScore;
          }
        }
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
    } as SeasonRanking;

    const lowestScore = ranking.played > 0 ? Math.min(...scores) : 0;
    const index = scores.findIndex((s) => s === lowestScore);
    const newScores =
      scores.length > 1
        ? [...scores.slice(0, index), ...scores.slice(index + 1)]
        : scores;
    if (newScores.length > 0) {
      ranking.rankingScore = Number(
        (
          newScores.reduce((prev, curr) => prev + curr) / newScores.length
        ).toFixed(2)
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

export function calculatePlayoffsRankings(
  matches: Match<MatchDetails>[],
  prevRankings: SeasonRanking[],
  members: AllianceMember[]
) {
  const rankingMap: Map<number, SeasonRanking> = new Map();

  for (const match of matches) {
    if (!match.participants) break;
    for (const participant of match.participants) {
      if (!rankingMap.get(participant.teamKey)) {
        rankingMap.set(participant.teamKey, {
          eventKey: participant.eventKey,
          tournamentKey: participant.tournamentKey,
          foodSecuredPoints: 0,
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

      if (!isFeedingTheFutureDetails(match.details)) continue;

      const ranking = {
        ...(rankingMap.get(participant.teamKey) as SeasonRanking)
      };

      if (participant.cardStatus === CardStatus.RED_CARD) {
        ranking.played += 1;
        rankingMap.set(participant.teamKey, ranking);
        continue;
      }

      if (participant.station < 20) {
        ranking.rankingScore += match.redScore;
      } else if (participant.station >= 20) {
        ranking.rankingScore += match.blueScore;
      }

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
  rankedMembers.forEach((m) => {
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

export function calculateScore(match: Match<MatchDetails>): [number, number] {
  const { details } = match;
  if (!details) return [0, 0];
  const nBalanced = getBalancedRobots(details);
  const [redResevoirPoints, blueResevoirPoints] = getResevoirPoints(details);
  const [redNexusPoints, blueNexusPoints] = getNexusPoints(details);
  const [redFoodProduced, blueFoodProduced] = getFoodProducedPoints(details);
  const [redFoodSecuredPoints, blueFoodSecuredPoints] =
    getFoodSecuredPoints(details);
  const coopertitionPoints = getCoopertitionPoints(details);
  const redScore =
    (redResevoirPoints + redNexusPoints + redFoodProduced) *
      ScoreTable.BalanceMultiplier(nBalanced) +
    redFoodSecuredPoints +
    coopertitionPoints;
  const blueScore =
    (blueResevoirPoints + blueNexusPoints + blueFoodProduced) *
      ScoreTable.BalanceMultiplier(nBalanced) +
    blueFoodSecuredPoints +
    coopertitionPoints;
  const redPenalty = Math.round(match.redMinPen * ScoreTable.Foul * redScore);
  const bluePenalty = Math.round(
    match.blueMinPen * ScoreTable.Foul * blueScore
  );
  return [redScore + bluePenalty, blueScore + redPenalty];
}

export function getResevoirPoints(details: MatchDetails): [number, number] {
  return [
    details.redResevoirConserved * ScoreTable.Conserved,
    details.blueResevoirConserved * ScoreTable.Conserved
  ];
}

export function getNexusPoints(details: MatchDetails): [number, number] {
  return [
    details.redNexusConserved * ScoreTable.Conserved,
    details.blueNexusConserved * ScoreTable.Conserved
  ];
}

export function getFoodProducedPoints(details: MatchDetails): [number, number] {
  return [
    details.redFoodProduced * ScoreTable.FoodProduced,
    details.blueFoodProduced * ScoreTable.FoodProduced
  ];
}

export function getFoodSecuredPoints(details: MatchDetails): [number, number] {
  return [
    details.redFoodSecured * ScoreTable.FoodSecured,
    details.blueFoodSecured * ScoreTable.FoodSecured
  ];
}

export function getBalancedRobots(details: MatchDetails): number {
  return (
    details.redRobotOneBalanced +
    details.redRobotTwoBalanced +
    details.redRobotThreeBalanced +
    details.blueRobotOneBalanced +
    details.blueRobotTwoBalanced +
    details.blueRobotThreeBalanced
  );
}

export function getCoopertitionPoints(details: MatchDetails): number {
  return ScoreTable.Coopertition(getBalancedRobots(details));
}

function compareRankings(a: SeasonRanking, b: SeasonRanking): number {
  if (a.rankingScore !== b.rankingScore) {
    return b.rankingScore - a.rankingScore;
  } else if (a.highestScore !== b.highestScore) {
    return b.highestScore - a.highestScore;
  } else if (a.foodSecuredPoints !== b.foodSecuredPoints) {
    return b.foodSecuredPoints - a.foodSecuredPoints;
  } else {
    return 0;
  }
}
