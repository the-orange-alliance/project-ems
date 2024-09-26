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
  calculateRankingPoints,
  calculatePlayoffsRankings,
  calculateScore,
  detailsToJson,
  detailsFromJson
};

export interface MatchDetails extends MatchDetailBase {
  redResevoirConserved: number;
  redFoodProduced: number;
  redRobotOneParked: number;
  redRobotTwoParked: number;
  redRobotThreeParked: number;
  redNexusState: AllianceNexusGoalState;
  blueResevoirConserved: number;
  blueFoodProduced: number;
  blueRobotOneParked: number;
  blueRobotTwoParked: number;
  blueRobotThreeParked: number;
  blueNexusState: AllianceNexusGoalState;
  coopertition: number;
  fieldBalanced: number;
  foodSecured: number;
}

export enum NexusGoalState {
  Empty = 0,
  BlueOnly = 1,
  GreenOnly = 2,
  Full = 3,
  Produced = 4
}
export interface AllianceNexusGoalState {
  CW1: NexusGoalState;
  CW2: NexusGoalState;
  CW3: NexusGoalState;
  CW4: NexusGoalState;
  CW5: NexusGoalState;
  CW6: NexusGoalState;
  EC1: NexusGoalState;
  EC2: NexusGoalState;
  EC3: NexusGoalState;
  EC4: NexusGoalState;
  EC5: NexusGoalState;
  EC6: NexusGoalState;
}

export const defaultNexusGoalState: AllianceNexusGoalState = {
  CW1: NexusGoalState.Empty,
  CW2: NexusGoalState.Empty,
  CW3: NexusGoalState.Empty,
  CW4: NexusGoalState.Empty,
  CW5: NexusGoalState.Empty,
  CW6: NexusGoalState.Empty,
  EC1: NexusGoalState.Empty,
  EC2: NexusGoalState.Empty,
  EC3: NexusGoalState.Empty,
  EC4: NexusGoalState.Empty,
  EC5: NexusGoalState.Empty,
  EC6: NexusGoalState.Empty
};

export const defaultMatchDetails: MatchDetails = {
  eventKey: '',
  id: -1,
  tournamentKey: '',
  redResevoirConserved: 0,
  redFoodProduced: 0,
  redRobotOneParked: 0,
  redRobotTwoParked: 0,
  redRobotThreeParked: 0,
  redNexusState: { ...defaultNexusGoalState },
  blueResevoirConserved: 0,
  blueFoodProduced: 0,
  blueRobotOneParked: 0,
  blueRobotTwoParked: 0,
  blueRobotThreeParked: 0,
  blueNexusState: { ...defaultNexusGoalState },
  coopertition: 0,
  fieldBalanced: 1,
  foodSecured: 0
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

function detailsToJson(details: MatchDetails): any {
  const json: any = {
    ...details,
    redCw1: details.redNexusState.CW1,
    redCw2: details.redNexusState.CW2,
    redCw3: details.redNexusState.CW3,
    redCw4: details.redNexusState.CW4,
    redCw5: details.redNexusState.CW5,
    redCw6: details.redNexusState.CW6,
    redEc1: details.redNexusState.EC1,
    redEc2: details.redNexusState.EC2,
    redEc3: details.redNexusState.EC3,
    redEc4: details.redNexusState.EC4,
    redEc5: details.redNexusState.EC5,
    redEc6: details.redNexusState.EC6,
    blueCw1: details.blueNexusState.CW1,
    blueCw2: details.blueNexusState.CW2,
    blueCw3: details.blueNexusState.CW3,
    blueCw4: details.blueNexusState.CW4,
    blueCw5: details.blueNexusState.CW5,
    blueCw6: details.blueNexusState.CW6,
    blueEc1: details.blueNexusState.EC1,
    blueEc2: details.blueNexusState.EC2,
    blueEc3: details.blueNexusState.EC3,
    blueEc4: details.blueNexusState.EC4,
    blueEc5: details.blueNexusState.EC5,
    blueEc6: details.blueNexusState.EC6
  };
  delete json.redNexusState;
  delete json.blueNexusState;
  return json;
}

function detailsFromJson(json?: any): MatchDetails | undefined {
  if (!json) return undefined;
  const stripped = {} as any;
  for (const key in json) {
    if (!/^(red|blue)(Cw|Ec)/.test(key)) {
      stripped[key] = json[key];
    }
  }
  return {
    ...stripped,
    redNexusState: {
      CW1: json.redCw1,
      CW2: json.redCw2,
      CW3: json.redCw3,
      CW4: json.redCw4,
      CW5: json.redCw5,
      CW6: json.redCw6,
      EC1: json.redEc1,
      EC2: json.redEc2,
      EC3: json.redEc3,
      EC4: json.redEc4,
      EC5: json.redEc5,
      EC6: json.redEc6
    },
    blueNexusState: {
      CW1: json.blueCw1,
      CW2: json.blueCw2,
      CW3: json.blueCw3,
      CW4: json.blueCw4,
      CW5: json.blueCw5,
      CW6: json.blueCw6,
      EC1: json.blueEc1,
      EC2: json.blueEc2,
      EC3: json.blueEc3,
      EC4: json.blueEc4,
      EC5: json.blueEc5,
      EC6: json.blueEc6
    }
  };
}

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
        ranking.wins = ranking.wins + (redWin ? 1 : 0);
        ranking.losses = ranking.losses + (redWin ? 0 : 1);
        ranking.ties = ranking.ties + (isTie ? 1 : 0);
        // Red Alliance
        if (participant.cardStatus <= CardStatus.YELLOW_CARD) {
          scoresMap.set(participant.teamKey, [...scores, match.redScore]);
          ranking.foodSecuredPoints +=
            match.details.foodSecured * ScoreTable.FoodSecured;
          if (ranking.highestScore < match.redScore) {
            ranking.highestScore = match.redScore;
          }
        }
      }

      if (participant.station >= 20) {
        ranking.wins = ranking.wins + (blueWin ? 1 : 0);
        ranking.losses = ranking.losses + (blueWin ? 0 : 1);
        ranking.ties = ranking.ties + (isTie ? 1 : 0);
        // Blue Alliance
        if (participant.cardStatus <= CardStatus.YELLOW_CARD) {
          scoresMap.set(participant.teamKey, [...scores, match.blueScore]);
          ranking.foodSecuredPoints +=
            match.details.foodSecured * ScoreTable.FoodSecured;
          if (ranking.highestScore < match.blueScore) {
            ranking.highestScore = match.blueScore;
          }
        }
      }

      // Handle white/red cards
      if (participant.cardStatus === CardStatus.RED_CARD) {
        // Indicate the score is -1 to signal that this score should not be counted.
        scoresMap.set(participant.teamKey, [...scores, -1]);
      } else if (participant.cardStatus === CardStatus.WHITE_CARD) {
        // Indicate the score is 0. The team may drop this match.
        scoresMap.set(participant.teamKey, [...scores, 0]);
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

    const qualifiedScores = scores.filter((s) => s >= 0);

    const lowestScore = ranking.played > 0 ? Math.min(...qualifiedScores) : 0;
    const index = scores.findIndex((s) => s === lowestScore);
    const newScores = (
      scores.length > 1 ? scores.splice(index, 1) : scores
    ).map((score) => (score >= 0 ? score : 0));
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

export function calculateRankingPoints(details: MatchDetails): MatchDetails {
  const deepCopy = JSON.parse(JSON.stringify(details)) as MatchDetails;
  const nBalanced = getBalancedRobots(details);
  deepCopy.coopertition = nBalanced < 5 ? 0 : nBalanced >= 6 ? 2 : 1;
  return deepCopy;
}

export function calculateScore(match: Match<MatchDetails>): [number, number] {
  const { details } = match;
  if (!details) return [0, 0];
  const nBalanced = getBalancedRobots(details);
  const [redResevoirPoints, blueResevoirPoints] = getResevoirPoints(details);
  const [redNexusPoints, blueNexusPoints] = getNexusPoints(details);
  const [redFoodProduced, blueFoodProduced] = getFoodProducedPoints(details);
  const foodSecuredPoints = getFoodSecuredPoints(details);
  const coopertitionPoints = getCoopertitionPoints(details);
  const redEnergyPoints = Math.round(
    (redResevoirPoints + redNexusPoints + redFoodProduced) *
      ScoreTable.BalanceMultiplier(nBalanced)
  );
  const redScore = redEnergyPoints + foodSecuredPoints + coopertitionPoints;
  const blueEnergyPoints = Math.round(
    (blueResevoirPoints + blueNexusPoints + blueFoodProduced) *
      ScoreTable.BalanceMultiplier(nBalanced)
  );
  const blueScore = blueEnergyPoints + foodSecuredPoints + coopertitionPoints;
  const redPenalty = Math.round(match.redMinPen * ScoreTable.Foul * redScore);
  const bluePenalty = Math.round(
    match.blueMinPen * ScoreTable.Foul * blueScore
  );
  return [
    Math.round(redScore + bluePenalty),
    Math.round(blueScore + redPenalty)
  ];
}

export function getResevoirPoints(details: MatchDetails): [number, number] {
  return [
    details.redResevoirConserved * ScoreTable.Conserved,
    details.blueResevoirConserved * ScoreTable.Conserved
  ];
}

export function getNexusPoints(details: MatchDetails): [number, number] {
  let [red, blue] = [0, 0];
  Object.keys(defaultNexusGoalState).forEach((key) => {
    switch ((details.redNexusState as any)[key]) {
      case NexusGoalState.BlueOnly:
      case NexusGoalState.GreenOnly:
        red += 1;
        break;
      case NexusGoalState.Full:
        red += 2;
        break;
    }

    switch ((details.blueNexusState as any)[key]) {
      case NexusGoalState.BlueOnly:
      case NexusGoalState.GreenOnly:
        blue += 1;
        break;
      case NexusGoalState.Full:
        blue += 2;
        break;
    }
  });

  return [red * ScoreTable.Conserved, blue * ScoreTable.Conserved];
}

export function getFoodProducedPoints(details: MatchDetails): [number, number] {
  return [
    details.redFoodProduced * ScoreTable.FoodProduced,
    details.blueFoodProduced * ScoreTable.FoodProduced
  ];
}

export function getFoodSecuredPoints(details: MatchDetails): number {
  return details.foodSecured * ScoreTable.FoodSecured;
}

export function getBalancedRobots(details: MatchDetails): number {
  return (
    (details.redRobotOneParked +
      details.redRobotTwoParked +
      details.redRobotThreeParked +
      details.blueRobotOneParked +
      details.blueRobotTwoParked +
      details.blueRobotThreeParked) *
    details.fieldBalanced
  );
}

export function getCoopertitionPoints(details: MatchDetails): number {
  switch (details.coopertition) {
    case 0:
      return 0;
    case 1:
      return 15;
    case 2:
      return 30;
  }
  return 0;
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
