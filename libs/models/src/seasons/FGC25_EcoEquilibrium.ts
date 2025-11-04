import z from 'zod';
import { AllianceMember } from '../base/Alliance.js';
import { Match, matchKeyZod, RESULT_NOT_PLAYED } from '../base/Match.js';
import { Ranking, rankingZod } from '../base/Ranking.js';
import { isNonNullObject, isNumber } from '../types.js';
import { Season, SeasonFunctions } from './index.js';

export enum CardStatus {
  WHITE_CARD = 3,
  RED_CARD = 2,
  YELLOW_CARD = 1,
  NO_CARD = 0
}

// Protection Multiplier is sum of robot park states + 1
const calcProtectionMultiplier = (
  robot1: MatchEndRobotState,
  robot2: MatchEndRobotState,
  robot3: MatchEndRobotState
): number => {
  return [robot1, robot2, robot3].reduce((count, state) => count + state, 1);
};

/**
 * Score Table`
 * Final score is ((WaterConserved + EnergyConserved + FoodProduced) * BalanceMultiplier) + FoodSecured + Coopertition
 */
export const ScoreTable = {
  ScoredBarrier: 1,
  BiodiversityUnit: 1,
  ProtectionMultiplierRed: (details: MatchDetails) =>
    calcProtectionMultiplier(
      details.redRobotOneParking,
      details.redRobotTwoParking,
      details.redRobotThreeParking
    ),
  ProtectionMultiplierBlue: (details: MatchDetails) =>
    calcProtectionMultiplier(
      details.blueRobotOneParking,
      details.blueRobotTwoParking,
      details.blueRobotThreeParking
    ),
  Coopertition: (details: MatchDetails) => {
    const numParking = [
      details.redRobotOneParking,
      details.redRobotTwoParking,
      details.redRobotThreeParking,
      details.blueRobotOneParking,
      details.blueRobotTwoParking,
      details.blueRobotThreeParking
    ].reduce(
      (count, state) => count + (state >= MatchEndRobotState.Level2 ? 1 : 0),
      0
    );

    return numParking < 5 ? 0 : numParking >= 6 ? 30 : 15;
  },
  MajorFoul: 0.1, // Needs to be applied to other alliance to be calculated properly
  MinorFoul: 0.05 // Needs to be applied to other alliance to be calculated properly
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

/**
 * MatchEndRobotState
 * Represents the state of a robot at the end of the match.
 * - Level0: On Floor, not touching rope
 * - Level1: On Floor, touching rope
 * - Level2: Fully supported by rope, not touching rope
 * - Level3: Fully supported by rope, above lower ECOSYSTEM strut
 * - Level4: Fully supported by rope, above upper ECOSYSTEM strut
 */
export enum MatchEndRobotState {
  Level0 = 0,
  Level1 = 0.125,
  Level2 = 0.25,
  Level3 = 0.375,
  Level4 = 0.5
}

export enum DistributionFactor {
  Even = 1,
  SomewhatEven = 0.6,
  NotEven = 0.5
}

export enum CoopertitionBonus {
  None = 0,
  Partial = 15,
  Full = 30
}

export const FGC25MatchDetailsZod = matchKeyZod.extend({
  // "Global Alliance" Points
  barriersInRedMitigator: z.number().int().min(0).default(0),
  barriersInBlueMitigator: z.number().int().min(0).default(0),
  // Biodiversity Units
  biodiversityUnitsRedSideEcosystem: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Biodiversity units in the red side ecosystem.  These are GLOBAL ALLIANCE scoring units, not alliance specific.  Color is used to identify the side of the field.  This value is manually entered after the match is over. (Not used for live-updates in the match)'
    ),
  biodiversityUnitsCenterEcosystem: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Biodiversity units in the center ecosystem.  These are GLOBAL ALLIANCE scoring units, not alliance specific.  This value is manually entered after the match is over. (Not used for live-updates in the match)'
    ),
  biodiversityUnitsBlueSideEcosystem: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Biodiversity units in the blue side ecosystem.  These are GLOBAL ALLIANCE scoring units, not alliance specific.  Color is used to identify the side of the field.  This value is manually entered after the match is over. (Not used for live-updates in the match)'
    ),
  // Biodiversity Distribution
  biodiversityDistributionFactor: z
    .nativeEnum(DistributionFactor)
    .default(DistributionFactor.NotEven),
  // Approximated biodiversity for live-updates in match
  approximateBiodiversityRedSideEcosystem: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Approximated biodiversity in the red side ecosystem.  This is used for live-updates in the match to allow the on-field LEDs to be at the correct level. This value is not used for scoring, and cannot be expected to represent the total number of biodoversity units in the ecosystem.'
    ),
  approximateBiodiversityCenterEcosystem: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Approximated biodiversity in the center ecosystem.  This is used for live-updates in the match to allow the on-field LEDs to be at the correct level. This value is not used for scoring, and cannot be expected to represent the total number of biodoversity units in the ecosystem.'
    ),
  approximateBiodiversityBlueSideEcosystem: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Approximated biodiversity in the blue side ecosystem.  This is used for live-updates in the match to allow the on-field LEDs to be at the correct level. This value is not used for scoring, and cannot be expected to represent the total number of biodoversity units in the ecosystem.'
    ),
  // Red robot parking states
  redRobotOneParking: z
    .nativeEnum(MatchEndRobotState)
    .default(MatchEndRobotState.Level0)
    .describe(
      'Multiplier for the red robot one (station 11) parking state, level 0-4.'
    ),
  redRobotTwoParking: z
    .nativeEnum(MatchEndRobotState)
    .default(MatchEndRobotState.Level0)
    .describe(
      'Multiplier for the red robot two (station 12) parking state, level 0-4.'
    ),
  redRobotThreeParking: z
    .nativeEnum(MatchEndRobotState)
    .default(MatchEndRobotState.Level0)
    .describe(
      'Multiplier for the red robot three (station 13) parking state, level 0-4.'
    ),
  blueRobotOneParking: z
    .nativeEnum(MatchEndRobotState)
    .default(MatchEndRobotState.Level0)
    .describe(
      'Multiplier for the blue robot one (station 21) parking state, level 0-4.'
    ),
  blueRobotTwoParking: z
    .nativeEnum(MatchEndRobotState)
    .default(MatchEndRobotState.Level0)
    .describe(
      'Multiplier for the blue robot two (station 22) parking state, level 0-4.'
    ),
  blueRobotThreeParking: z
    .nativeEnum(MatchEndRobotState)
    .default(MatchEndRobotState.Level0)
    .describe(
      'Multiplier for the blue robot three (station 23) parking state, level 0-4.'
    ),

  // Calculated Values (values we always calculate ourselves, as they're dependent on other values in the match details)
  coopertition: z
    .nativeEnum(CoopertitionBonus)
    .default(CoopertitionBonus.None)
    .describe(
      'Coopertition bonus points.  This is a calculated value based on the parking states of all robots.'
    ),
  biodiversityDistributed: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Biodiversity distributed points.  This is a calculated value based on the biodiversity units in the ecosystems and the biodiversity distribution factor.'
    ),
  redProtectionMultiplier: z
    .number()
    .min(1)
    .max(1 + MatchEndRobotState.Level4 * 3)
    .default(1)
    .describe(
      'Red alliance protection multiplier.  This is a calculated value based on the parking states of the red robots.'
    ),
  blueProtectionMultiplier: z
    .number()
    .min(1)
    .max(1 + MatchEndRobotState.Level4 * 3)
    .default(1)
    .describe(
      'Blue alliance protection multiplier.  This is a calculated value based on the parking states of the blue robots.'
    ),
  allBarriersCleared: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Whether all barriers were cleared during the match.  1 if all barriers were cleared, 0 otherwise.'
    )
});

export type MatchDetails = z.infer<typeof FGC25MatchDetailsZod>;

export const defaultMatchDetails: MatchDetails = {
  eventKey: '',
  id: -1,
  tournamentKey: '',
  barriersInRedMitigator: 0,
  barriersInBlueMitigator: 0,
  biodiversityUnitsRedSideEcosystem: 0,
  biodiversityUnitsCenterEcosystem: 0,
  biodiversityUnitsBlueSideEcosystem: 0,
  biodiversityDistributionFactor: DistributionFactor.NotEven,
  approximateBiodiversityRedSideEcosystem: 0,
  approximateBiodiversityCenterEcosystem: 0,
  approximateBiodiversityBlueSideEcosystem: 0,
  redRobotOneParking: MatchEndRobotState.Level0,
  redRobotTwoParking: MatchEndRobotState.Level0,
  redRobotThreeParking: MatchEndRobotState.Level0,
  redProtectionMultiplier: 1,
  blueRobotOneParking: MatchEndRobotState.Level0,
  blueRobotTwoParking: MatchEndRobotState.Level0,
  blueRobotThreeParking: MatchEndRobotState.Level0,
  blueProtectionMultiplier: 1,
  coopertition: CoopertitionBonus.None,
  biodiversityDistributed: 0,
  allBarriersCleared: 0
};

export const isEcoEquilibriumDetails = (obj: unknown): obj is MatchDetails =>
  isNonNullObject(obj) &&
  isNumber(obj.barriersInBlueMitigator) &&
  isNumber(obj.barriersInRedMitigator);

export interface SeasonRanking extends Ranking {
  rankingScore: number;
  highestScore: number;
  protectionPoints: number;
}

export const SeasonRankingSchema = rankingZod.extend({
  rankingScore: z.number(),
  highestScore: z.number(),
  protectionPoints: z.number()
});

export const EcoEquilibriumSeason: Season<MatchDetails, SeasonRanking> = {
  key: 'fgc_2025',
  program: 'fgc',
  name: 'Eco Equilibrium',
  defaultMatchDetails,
  functions
};

function detailsToJson(details: MatchDetails): any {
  return { ...details };
}

function detailsFromJson(json?: any): MatchDetails | undefined {
  if (!json) return undefined;
  try {
    return FGC25MatchDetailsZod.parse(json);
  } catch (e) {
    return undefined;
  }
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
          protectionPoints: 0,
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
        !isEcoEquilibriumDetails(match.details) ||
        participant.disqualified === 1 ||
        participant.surrogate > 0 ||
        match.result === RESULT_NOT_PLAYED
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

      // Sum ties
      ranking.ties += isTie ? 1 : 0;

      // Red Alliance
      if (participant.station < 20) {
        ranking.wins = ranking.wins + (redWin ? 1 : 0);
        ranking.losses = ranking.losses + (redWin ? 0 : 1);

        if (participant.cardStatus <= CardStatus.YELLOW_CARD) {
          scoresMap.set(participant.teamKey, [...scores, match.redScore]);
          switch (participant.station) {
            case 11:
              ranking.protectionPoints += match.details.redRobotOneParking;
              break;
            case 12:
              ranking.protectionPoints += match.details.redRobotTwoParking;
              break;
            case 13:
              ranking.protectionPoints += match.details.redRobotThreeParking;
              break;
          }
          ranking.highestScore = Math.max(ranking.highestScore, match.redScore);
        }
      }

      // Blue Alliance
      if (participant.station >= 20) {
        ranking.wins = ranking.wins + (blueWin ? 1 : 0);
        ranking.losses = ranking.losses + (blueWin ? 0 : 1);

        if (participant.cardStatus <= CardStatus.YELLOW_CARD) {
          scoresMap.set(participant.teamKey, [...scores, match.blueScore]);
          switch (participant.station) {
            case 21:
              ranking.protectionPoints += match.details.blueRobotOneParking;
              break;
            case 22:
              ranking.protectionPoints += match.details.blueRobotTwoParking;
              break;
            case 23:
              ranking.protectionPoints += match.details.blueRobotThreeParking;
              break;
          }
          ranking.highestScore = Math.max(
            ranking.highestScore,
            match.blueScore
          );
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
      scores.length > 1 ? scores.filter((_, i) => i !== index) : scores
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
          protectionPoints: 0,
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

      if (
        !isEcoEquilibriumDetails(match.details) ||
        match.result === RESULT_NOT_PLAYED
      )
        continue;

      const ranking = {
        ...(rankingMap.get(participant.teamKey) as SeasonRanking)
      };

      if (
        participant.station < 20 &&
        participant.cardStatus <= CardStatus.YELLOW_CARD
      ) {
        ranking.rankingScore += match.redScore;
      } else if (
        participant.station >= 20 &&
        participant.cardStatus <= CardStatus.YELLOW_CARD
      ) {
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

export function calculateBiodiversityDistributed(
  details: MatchDetails
): number {
  return (
    (details.biodiversityUnitsRedSideEcosystem +
      details.biodiversityUnitsCenterEcosystem +
      details.biodiversityUnitsBlueSideEcosystem) *
    ScoreTable.BiodiversityUnit *
    details.biodiversityDistributionFactor
  );
}

export function calculateDistributionFactor(details: MatchDetails): number {
  if (!details.allBarriersCleared) return DistributionFactor.NotEven;

  // Get the biodiversity unit counts for each of the three ecosystems
  const biodiversityUnits = [
    details.biodiversityUnitsRedSideEcosystem,
    details.biodiversityUnitsBlueSideEcosystem,
    details.biodiversityUnitsCenterEcosystem
  ];

  // Calculate the mean (average) of the biodiversity units
  const sum = biodiversityUnits.reduce((a, b) => a + b, 0);

  const mean = sum / biodiversityUnits.length;

  // Calculate total - avg for each ecosystem
  const redMinusMean = biodiversityUnits[0] - mean;
  const blueMinusMean = biodiversityUnits[1] - mean;
  const centerMinusMean = biodiversityUnits[2] - mean;

  // Calculate squared differences
  const redSquared = redMinusMean * redMinusMean;
  const blueSquared = blueMinusMean * blueMinusMean;
  const centerSquared = centerMinusMean * centerMinusMean;

  // Calculate the sum of squared differences
  const sumSquared = redSquared + blueSquared + centerSquared;

  // Calculate the average of the squared differences
  const averageSquared = sumSquared / biodiversityUnits.length;

  // Calculate the standard deviation (sigma)
  const sigma = Math.sqrt(averageSquared);

  let variance: DistributionFactor = DistributionFactor.NotEven;

  // Apply the logic from the achievement table
  if (sigma >= 0 && sigma <= 1) {
    variance = DistributionFactor.Even;
  } else if (sigma > 1 && sigma < 10) {
    variance = DistributionFactor.SomewhatEven;
  } else if (sigma >= 10) {
    variance = DistributionFactor.NotEven;
  } else {
    // This covers any unexpected cases
    variance = DistributionFactor.NotEven;
  }

  return variance;
}

export function calculateRankingPoints(details: MatchDetails): MatchDetails {
  const copy = { ...details };
  copy.coopertition = ScoreTable.Coopertition(copy);
  copy.biodiversityDistributionFactor = calculateDistributionFactor(copy);
  copy.biodiversityDistributed = calculateBiodiversityDistributed(copy);
  copy.redProtectionMultiplier = ScoreTable.ProtectionMultiplierRed(copy);
  copy.blueProtectionMultiplier = ScoreTable.ProtectionMultiplierBlue(copy);
  return copy;
}

export function calculateScore(
  match: Match<MatchDetails>,
  matchInProgress?: boolean
): [number, number] {
  const { details } = match;
  if (!details) return [0, 0];
  // Coopertition Bonus Points
  const coopertitionPoints = ScoreTable.Coopertition(details);

  // If match is in progress, do some crude math to turn the approx. biodiversity into scored biodiversity
  if (matchInProgress) {
    const ballsPerPixel = 5 / 5; // 5 balls / 5 pixels
    details.biodiversityUnitsRedSideEcosystem = Math.floor(
      details.approximateBiodiversityRedSideEcosystem * ballsPerPixel
    );
    details.biodiversityUnitsCenterEcosystem = Math.floor(
      details.approximateBiodiversityCenterEcosystem * ballsPerPixel
    );
    details.biodiversityUnitsBlueSideEcosystem = Math.floor(
      details.approximateBiodiversityBlueSideEcosystem * ballsPerPixel
    );
  }

  // Global Alliance Points
  const barrierPoints =
    (details.barriersInRedMitigator + details.barriersInBlueMitigator) *
    ScoreTable.ScoredBarrier;

  const biodiversityDistributed = calculateBiodiversityDistributed(details);
  const globalPoints = barrierPoints + biodiversityDistributed;

  // Alliance Specific Points
  const protectionMultiplierRed = ScoreTable.ProtectionMultiplierRed(details);
  const protectionMultiplierBlue = ScoreTable.ProtectionMultiplierBlue(details);

  // Total Score
  const redScore = globalPoints * protectionMultiplierRed + coopertitionPoints;
  const blueScore =
    globalPoints * protectionMultiplierBlue + coopertitionPoints;

  // Penalty
  const redPenaltyMinor = match.redMinPen * ScoreTable.MinorFoul * redScore;
  const redPenaltyMajor = match.redMajPen * ScoreTable.MajorFoul * redScore;
  const bluePenaltyMinor = match.blueMinPen * ScoreTable.MinorFoul * blueScore;
  const bluePenaltyMajor = match.blueMajPen * ScoreTable.MajorFoul * blueScore;

  // Final score is
  return [
    Math.ceil(redScore + bluePenaltyMajor + bluePenaltyMinor),
    Math.ceil(blueScore + redPenaltyMajor + redPenaltyMinor)
  ];
}

function compareRankings(a: SeasonRanking, b: SeasonRanking): number {
  if (a.rankingScore !== b.rankingScore) {
    return b.rankingScore - a.rankingScore;
  } else if (a.highestScore !== b.highestScore) {
    return b.highestScore - a.highestScore;
  } else if (a.protectionPoints !== b.protectionPoints) {
    return b.protectionPoints - a.protectionPoints;
  } else {
    return 0;
  }
}
