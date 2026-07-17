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

/**
 * BraceState
 * Represents the state of a ROBOT on the BRACE at the end of the MATCH.
 * The enum value is also the CLIMB MULTIPLIER increment earned per ROBOT.
 * - None: Not in contact with the BRACE
 * - Contact: In contact with ZONE 1, still in contact with the PLAYING FIELD SURFACE
 * - Zone1: Fully supported (directly or indirectly) by ZONE 1, not touching the PLAYING FIELD SURFACE
 * - Zone2: Fully supported (directly or indirectly) by ZONE 2, not touching the PLAYING FIELD SURFACE
 * - Zone3: Fully supported (directly or indirectly) by ZONE 3, not touching the PLAYING FIELD SURFACE
 */
export enum BraceState {
  None = 0,
  Contact = 0.05,
  Zone1 = 0.1,
  Zone2 = 0.2,
  Zone3 = 0.3
}

/**
 * COOPERTITION BONUS
 * Earned by the GLOBAL ALLIANCE when 4 or more ROBOTS (across both REGIONAL ALLIANCES)
 * are fully supported by ZONE 3 of the BRACES at the end of the MATCH.
 */
export enum CoopertitionBonus {
  None = 0,
  Four = 10,
  Five = 25,
  Six = 40
}

/**
 * Score Table
 */
export const ScoreTable = {
  WildfireContainedSuppression: 1,
  WildfireContainedExtinguisher: 1,
  PartnerClimb: 25,
  // Sum of the BraceState values of the three ROBOTS + 1 (Table 3-4)
  ClimbMultiplierRed: (details: MatchDetails) =>
    1 +
    details.redRobotOneBraceState +
    details.redRobotTwoBraceState +
    details.redRobotThreeBraceState,
  ClimbMultiplierBlue: (details: MatchDetails) =>
    1 + 
    details.blueRobotOneBraceState +
    details.blueRobotTwoBraceState +
    details.blueRobotThreeBraceState,
  // 25 points per red ROBOT with a PARTNER CLIMB flag set (Table 3-5).
  PartnerClimbRed: (details: MatchDetails) =>
    ((details.redRobotOnePartnerClimb ? 1 : 0) +
      (details.redRobotTwoPartnerClimb ? 1 : 0) +
      (details.redRobotThreePartnerClimb ? 1 : 0)) *
    ScoreTable.PartnerClimb,
  PartnerClimbBlue: (details: MatchDetails) =>
    ((details.blueRobotOnePartnerClimb ? 1 : 0) +
      (details.blueRobotTwoPartnerClimb ? 1 : 0) +
      (details.blueRobotThreePartnerClimb ? 1 : 0)) *
    ScoreTable.PartnerClimb,
  // Counts ROBOTS (across both REGIONAL ALLIANCES) fully supported by ZONE 3
  // of the BRACE and maps 4/5/6 ROBOTS to CoopertitionBonus.Four/Five/Six
  // (Table 3-6).
  Coopertition: (details: MatchDetails): CoopertitionBonus => {
    const zone3Count = [
      details.redRobotOneBraceState,
      details.redRobotTwoBraceState,
      details.redRobotThreeBraceState,
      details.blueRobotOneBraceState,
      details.blueRobotTwoBraceState,
      details.blueRobotThreeBraceState
    ].reduce(
      (count, state) => count + (state >= BraceState.Zone3 ? 1 : 0),
      0
    );

    if (zone3Count >= 6) return CoopertitionBonus.Six;
    if (zone3Count === 5) return CoopertitionBonus.Five;
    if (zone3Count === 4) return CoopertitionBonus.Four;
    return CoopertitionBonus.None;
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

export const FGC26MatchDetailsZod = matchKeyZod.extend({
  // SUPPRESSION UNIT WILDFIRE counts (REGIONAL ALLIANCE scoring)
  wildfireInRedSuppressionUnit: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Number of WILDFIRE CONTAINED in the red SUPPRESSION UNIT at the end of the MATCH.'
    ),
  wildfireInBlueSuppressionUnit: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Number of WILDFIRE CONTAINED in the blue SUPPRESSION UNIT at the end of the MATCH.'
    ),
  // EXTINGUISHER WILDFIRE count (shared GLOBAL ALLIANCE scoring)
  wildfireInExtinguisher: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Number of WILDFIRE CONTAINED in the EXTINGUISHER at the end of the MATCH. This is a GLOBAL ALLIANCE value shared by both REGIONAL ALLIANCES.'
    ),

  // Red robot BRACE states
  redRobotOneBraceState: z
    .nativeEnum(BraceState)
    .default(BraceState.None)
    .describe('BRACE CLIMB state for the red robot one (station 11).'),
  redRobotTwoBraceState: z
    .nativeEnum(BraceState)
    .default(BraceState.None)
    .describe('BRACE CLIMB state for the red robot two (station 12).'),
  redRobotThreeBraceState: z
    .nativeEnum(BraceState)
    .default(BraceState.None)
    .describe('BRACE CLIMB state for the red robot three (station 13).'),
  blueRobotOneBraceState: z
    .nativeEnum(BraceState)
    .default(BraceState.None)
    .describe('BRACE CLIMB state for the blue robot one (station 21).'),
  blueRobotTwoBraceState: z
    .nativeEnum(BraceState)
    .default(BraceState.None)
    .describe('BRACE CLIMB state for the blue robot two (station 22).'),
  blueRobotThreeBraceState: z
    .nativeEnum(BraceState)
    .default(BraceState.None)
    .describe('BRACE CLIMB state for the blue robot three (station 23).'),

  // Red robot PARTNER CLIMB flags
  redRobotOnePartnerClimb: z
    .boolean()
    .default(false)
    .describe(
      'Whether red robot one (station 11) was fully supported by another red ROBOT (PARTNER CLIMB).'
    ),
  redRobotTwoPartnerClimb: z
    .boolean()
    .default(false)
    .describe(
      'Whether red robot two (station 12) was fully supported by another red ROBOT (PARTNER CLIMB).'
    ),
  redRobotThreePartnerClimb: z
    .boolean()
    .default(false)
    .describe(
      'Whether red robot three (station 13) was fully supported by another red ROBOT (PARTNER CLIMB).'
    ),
  blueRobotOnePartnerClimb: z
    .boolean()
    .default(false)
    .describe(
      'Whether blue robot one (station 21) was fully supported by another blue ROBOT (PARTNER CLIMB).'
    ),
  blueRobotTwoPartnerClimb: z
    .boolean()
    .default(false)
    .describe(
      'Whether blue robot two (station 22) was fully supported by another blue ROBOT (PARTNER CLIMB).'
    ),
  blueRobotThreePartnerClimb: z
    .boolean()
    .default(false)
    .describe(
      'Whether blue robot three (station 23) was fully supported by another blue ROBOT (PARTNER CLIMB).'
    ),

  // Calculated Values (values we always calculate ourselves, as they're dependent on other values in the match details)
  coopertition: z
    .nativeEnum(CoopertitionBonus)
    .default(CoopertitionBonus.None)
    .describe(
      'COOPERTITION BONUS points. This is a calculated value based on the BRACE states of all six ROBOTS.'
    ),
  redClimbMultiplier: z
    .number()
    .min(0)
    .default(0)
    .describe(
      'Red alliance CLIMB MULTIPLIER. This is a calculated value based on the BRACE states of the red ROBOTS.'
    ),
  blueClimbMultiplier: z
    .number()
    .min(0)
    .default(0)
    .describe(
      'Blue alliance CLIMB MULTIPLIER. This is a calculated value based on the BRACE states of the blue ROBOTS.'
    ),
  redPartnerClimbPoints: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Red alliance PARTNER CLIMB points. This is a calculated value based on the number of red ROBOTS that earned a PARTNER CLIMB.'
    ),
  bluePartnerClimbPoints: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe(
      'Blue alliance PARTNER CLIMB points. This is a calculated value based on the number of blue ROBOTS that earned a PARTNER CLIMB.'
    )
});

export type MatchDetails = z.infer<typeof FGC26MatchDetailsZod>;

export const defaultMatchDetails: MatchDetails = {
  eventKey: '',
  id: -1,
  tournamentKey: '',
  wildfireInRedSuppressionUnit: 0,
  wildfireInBlueSuppressionUnit: 0,
  wildfireInExtinguisher: 0,
  redRobotOneBraceState: BraceState.None,
  redRobotTwoBraceState: BraceState.None,
  redRobotThreeBraceState: BraceState.None,
  blueRobotOneBraceState: BraceState.None,
  blueRobotTwoBraceState: BraceState.None,
  blueRobotThreeBraceState: BraceState.None,
  redRobotOnePartnerClimb: false,
  redRobotTwoPartnerClimb: false,
  redRobotThreePartnerClimb: false,
  blueRobotOnePartnerClimb: false,
  blueRobotTwoPartnerClimb: false,
  blueRobotThreePartnerClimb: false,
  coopertition: CoopertitionBonus.None,
  redClimbMultiplier: 0,
  blueClimbMultiplier: 0,
  redPartnerClimbPoints: 0,
  bluePartnerClimbPoints: 0
};

export const isIgnitingInnovationDetails = (
  obj: unknown
): obj is MatchDetails =>
  isNonNullObject(obj) &&
  isNumber(obj.wildfireInRedSuppressionUnit) &&
  isNumber(obj.wildfireInBlueSuppressionUnit);

export interface SeasonRanking extends Ranking {
  rankingScore: number;
  highestScore: number;
  climbPoints: number;
}

export const SeasonRankingSchema = rankingZod.extend({
  rankingScore: z.number(),
  highestScore: z.number(),
  climbPoints: z.number()
});

export const IgnitingInnovationSeason: Season<MatchDetails, SeasonRanking> = {
  key: 'fgc_2026',
  program: 'fgc',
  name: 'Igniting Innovation',
  defaultMatchDetails,
  functions
};

function detailsToJson(details: MatchDetails): any {
  return { ...details };
}

function detailsFromJson(json?: any): MatchDetails | undefined {
  if (!json) return undefined;
  try {
    return FGC26MatchDetailsZod.parse(json);
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
          climbPoints: 0,
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
        !isIgnitingInnovationDetails(match.details) ||
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
              ranking.climbPoints += match.details.redRobotOneBraceState;
              break;
            case 12:
              ranking.climbPoints += match.details.redRobotTwoBraceState;
              break;
            case 13:
              ranking.climbPoints += match.details.redRobotThreeBraceState;
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
              ranking.climbPoints += match.details.blueRobotOneBraceState;
              break;
            case 22:
              ranking.climbPoints += match.details.blueRobotTwoBraceState;
              break;
            case 23:
              ranking.climbPoints += match.details.blueRobotThreeBraceState;
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
          climbPoints: 0,
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
        !isIgnitingInnovationDetails(match.details) ||
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

export function calculateRankingPoints(details: MatchDetails): MatchDetails {
  const copy = { ...details };
  copy.coopertition = ScoreTable.Coopertition(copy);
  copy.redClimbMultiplier = ScoreTable.ClimbMultiplierRed(copy);
  copy.blueClimbMultiplier = ScoreTable.ClimbMultiplierBlue(copy);
  copy.redPartnerClimbPoints = ScoreTable.PartnerClimbRed(copy);
  copy.bluePartnerClimbPoints = ScoreTable.PartnerClimbBlue(copy);
  return copy;
}

export function calculateScore(
  match: Match<MatchDetails>,
  matchInProgress?: boolean
): [number, number] {
  const { details } = match;
  if (!details) return [0, 0];

  // Game Manual Section 3.6 (Scoring Summary):
  //   allianceScore = (SUPPRESSION UNIT points * CLIMB MULTIPLIER)
  //                   + PARTNER CLIMB points + EXTINGUISHER points
  //                   + COOPERTITION BONUS points
  // EXTINGUISHER points and the COOPERTITION BONUS are GLOBAL ALLIANCE
  // values shared equally by both REGIONAL ALLIANCES.

  const redSuppressionUnitPoints =
    details.wildfireInRedSuppressionUnit * ScoreTable.WildfireContainedSuppression;
  const blueSuppressionUnitPoints =
    details.wildfireInBlueSuppressionUnit * ScoreTable.WildfireContainedSuppression;

  const redClimbMultiplier = ScoreTable.ClimbMultiplierRed(details);
  const blueClimbMultiplier = ScoreTable.ClimbMultiplierBlue(details);

  const redPartnerClimbPoints = ScoreTable.PartnerClimbRed(details);
  const bluePartnerClimbPoints = ScoreTable.PartnerClimbBlue(details);

  const extinguisherPoints =
    details.wildfireInExtinguisher * ScoreTable.WildfireContainedExtinguisher;
  const coopertitionPoints = ScoreTable.Coopertition(details);

  const redScore =
    redSuppressionUnitPoints * redClimbMultiplier +
    redPartnerClimbPoints +
    extinguisherPoints +
    coopertitionPoints;
  const blueScore =
    blueSuppressionUnitPoints * blueClimbMultiplier +
    bluePartnerClimbPoints +
    extinguisherPoints +
    coopertitionPoints;

  // Penalty calculation (unchanged pattern - see Table 4-1 / rule M-series violations)
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
  } else if (a.climbPoints !== b.climbPoints) {
    return b.climbPoints - a.climbPoints;
  } else {
    return 0;
  }
}
