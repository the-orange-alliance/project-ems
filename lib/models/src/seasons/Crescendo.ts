import { randomInt } from 'crypto';
import { AllianceMember } from '../Alliance.js';
import { Match, MatchDetailBase, RESULT_NOT_PLAYED } from '../Match.js';
import { Ranking } from '../Ranking.js';
import { isNonNullObject, isNumber } from '../types.js';
import { Season, SeasonFunctions } from './index.js';

/**
 * Score Table
 */
export const ScoreTable = {
  Auto: {
    Mobility: 2,
    AmpNote: 2,
    SpeakerNote: 5
  },
  TeleOp: {
    AmpNote: 1,
    SpeakerNote: 2,
    SpeakerNoteAmped: 5,
    Harmony: 2
  },
  Stage: {
    Park: 1,
    Onstage: 3,
    OnStageSpotlit: 4,
    Harmony: 2,
    TrapNote: 5
  },
  RankingPoints: {
    Melody: (notes: number, coopertitionBonus: boolean): boolean =>
      coopertitionBonus ? notes >= 15 : notes >= 18,
    Ensemble: (stagePoints: number, stageRobots: number): boolean =>
      stagePoints >= 10 && stageRobots >= 2,
    Tie: (redScore: number, blueScore: number): boolean =>
      redScore === blueScore,
    Win: (aScore: number, bScore: number): boolean => aScore > bScore
  },
  Penalties: {
    Foul: 2,
    TechFoul: 5
  }
};

/**
 * Main season function declaration for the whole file.
 */
const functions: SeasonFunctions<MatchDetails, SeasonRanking> = {
  calculateRankings,
  calculatePlayoffsRankings,
  calculateScore,
  calculateAutoScore: getAutoPoints,
  calculateTeleScore: getTeleOpPoints,
  calculateEndScore: (match: Match<MatchDetails>) =>
    getStagePoints(match.details),
  calculateRankingPoints: getRankingPoints
};

export enum StageStatus {
  NONE = 0,
  PARK = 1,
  ONSTAGE = 2,
  ONSTAGE_SPOTLIT = 3
}

export interface MatchDetails extends MatchDetailBase {
  redAutoMobilityOne: number;
  redAutoMobilityTwo: number;
  redAutoMobilityThree: number;
  redAutoAmpNotes: number;
  redAutoSpeakerNotes: number;
  redTeleAmpNotes: number;
  redTeleSpeakerNotes: number;
  redTeleSpeakerNotesAmped: number;
  redTeleTrapNotes: number;
  redEndStageStatusOne: StageStatus;
  redEndStageStatusTwo: StageStatus;
  redEndStageStatusThree: StageStatus;
  redHarmonyStatus: number;
  redMelodyStatus: number;
  redEnsembleStatus: number;
  blueAutoMobilityOne: number;
  blueAutoMobilityTwo: number;
  blueAutoMobilityThree: number;
  blueAutoAmpNotes: number;
  blueAutoSpeakerNotes: number;
  blueTeleAmpNotes: number;
  blueTeleSpeakerNotes: number;
  blueTeleSpeakerNotesAmped: number;
  blueTeleTrapNotes: number;
  blueEndStageStatusOne: StageStatus;
  blueEndStageStatusTwo: StageStatus;
  blueEndStageStatusThree: StageStatus;
  blueHarmonyStatus: number;
  blueMelodyStatus: number;
  blueEnsembleStatus: number;
  coopertitionBonus: number;
}

export const defaultMatchDetails: MatchDetails = {
  eventKey: '',
  id: -1,
  tournamentKey: '',
  redAutoMobilityOne: 0,
  redAutoMobilityTwo: 0,
  redAutoMobilityThree: 0,
  redAutoAmpNotes: 0,
  redAutoSpeakerNotes: 0,
  redTeleAmpNotes: 0,
  redTeleSpeakerNotes: 0,
  redTeleSpeakerNotesAmped: 0,
  redTeleTrapNotes: 0,
  redEndStageStatusOne: 0,
  redEndStageStatusTwo: 0,
  redEndStageStatusThree: 0,
  redHarmonyStatus: 0,
  redMelodyStatus: 0,
  redEnsembleStatus: 0,
  blueAutoMobilityOne: 0,
  blueAutoMobilityTwo: 0,
  blueAutoMobilityThree: 0,
  blueAutoAmpNotes: 0,
  blueAutoSpeakerNotes: 0,
  blueTeleAmpNotes: 0,
  blueTeleSpeakerNotes: 0,
  blueTeleSpeakerNotesAmped: 0,
  blueTeleTrapNotes: 0,
  blueEndStageStatusOne: 0,
  blueEndStageStatusTwo: 0,
  blueEndStageStatusThree: 0,
  blueHarmonyStatus: 0,
  blueMelodyStatus: 0,
  blueEnsembleStatus: 0,
  coopertitionBonus: 0
};

export interface SeasonRanking extends Ranking {
  rankingScore: number;
  avgCoopertitionPoints: number;
  avgAllianceMatchPoints: number;
  avgAllianceAutoPoints: number;
  avgAllianceStagePoints: number;
}

export const CrescendoSeason: Season<MatchDetails, SeasonRanking> = {
  key: 'frc_2024',
  program: 'frc',
  name: 'Crescendo',
  defaultMatchDetails,
  functions
};

export const isCrescendoDetails = (obj: unknown): obj is MatchDetails =>
  isNonNullObject(obj) &&
  isNumber(obj.redTeleAmpNotes) &&
  isNumber(obj.blueTeleAmpNotes);

export const isCrescendoRankig = (obj: unknown): obj is SeasonRanking =>
  isNonNullObject(obj) &&
  isNumber(obj.rankingScore) &&
  isNumber(obj.avgCoopertitionPoints) &&
  isNumber(obj.avgAllianceMatchPoints) &&
  isNumber(obj.avgAllianceAutoPoints) &&
  isNumber(obj.avgAllianceStagePoints);

/* Functions for calculating ranks. */
function calculateRankings(
  matches: Match<MatchDetails>[],
  prevRankings: SeasonRanking[]
): SeasonRanking[] {
  const rankingMap: Map<number, SeasonRanking> = new Map();
  const rankingPointsMap: Map<number, number> = new Map();
  const coopertitionPointsMap: Map<number, number> = new Map();
  const matchPointsMap: Map<number, number> = new Map();
  const autoPointsMap: Map<number, number> = new Map();
  const stagePointsMap: Map<number, number> = new Map();

  for (const match of matches) {
    if (!match.participants) break;
    for (const participant of match.participants) {
      const { eventKey, tournamentKey, teamKey } = participant;
      if (!rankingMap.get(teamKey)) {
        rankingMap.set(teamKey, {
          eventKey,
          tournamentKey,
          teamKey,
          wins: 0,
          losses: 0,
          played: 0,
          ties: 0,
          rank: 0,
          rankChange: 0,
          rankingScore: 0,
          avgAllianceAutoPoints: 0,
          avgAllianceMatchPoints: 0,
          avgAllianceStagePoints: 0,
          avgCoopertitionPoints: 0
        });
      }

      if (!rankingPointsMap.get(teamKey)) {
        rankingPointsMap.set(teamKey, 0);
      }

      if (!coopertitionPointsMap.get(teamKey)) {
        coopertitionPointsMap.set(teamKey, 0);
      }

      if (!matchPointsMap.get(teamKey)) {
        matchPointsMap.set(teamKey, 0);
      }

      if (!autoPointsMap.get(teamKey)) {
        autoPointsMap.set(teamKey, 0);
      }

      if (!stagePointsMap.get(teamKey)) {
        stagePointsMap.set(teamKey, 0);
      }

      if (
        !isCrescendoDetails(match.details) ||
        participant.disqualified === 1 ||
        participant.surrogate > 0
      ) {
        continue;
      }

      const ranking = {
        ...(rankingMap.get(participant.teamKey) as SeasonRanking)
      };
      const prevCoopertitionPoints = coopertitionPointsMap.get(
        participant.teamKey
      ) as number;
      const prevRankingPoints = rankingPointsMap.get(
        participant.teamKey
      ) as number;
      const prevMatchPoints = matchPointsMap.get(participant.teamKey) as number;
      const prevAutoPoints = autoPointsMap.get(participant.teamKey) as number;
      const prevStagePoints = stagePointsMap.get(participant.teamKey) as number;

      if (
        typeof prevCoopertitionPoints === 'undefined' ||
        typeof prevMatchPoints === 'undefined' ||
        typeof prevAutoPoints === 'undefined' ||
        typeof prevStagePoints === 'undefined' ||
        match.result <= RESULT_NOT_PLAYED
      ) {
        continue;
      }

      const isRed = participant.station < 20;
      const [redAutoScore, blueAutoScore] = getAutoPoints(match);
      const [redStageScore, blueStageScore] = getStagePoints(match.details);
      const [redPenaltyScore, bluePenaltyScore] = getPenaltyPoints(
        match.redMinPen,
        match.redMajPen,
        match.blueMinPen,
        match.blueMajPen
      );
      const matchScore = isRed
        ? match.redScore - redPenaltyScore
        : match.blueScore - bluePenaltyScore;
      const autoScore = isRed ? redAutoScore : blueAutoScore;
      const stageScore = isRed ? redStageScore : blueStageScore;
      const additionalRankingsPoints = isRed
        ? match.details.redMelodyStatus + match.details.redEnsembleStatus
        : match.details.blueMelodyStatus + match.details.blueEnsembleStatus;

      if (
        participant.cardStatus < 2 &&
        participant.disqualified < 1 &&
        participant.noShow < 1
      ) {
        coopertitionPointsMap.set(
          teamKey,
          prevCoopertitionPoints + match.details.coopertitionBonus
        );
        matchPointsMap.set(teamKey, prevMatchPoints + matchScore);
        autoPointsMap.set(teamKey, prevAutoPoints + autoScore);
        stagePointsMap.set(teamKey, prevStagePoints + stageScore);
        rankingPointsMap.set(
          teamKey,
          prevRankingPoints + additionalRankingsPoints
        );

        const isTie = ScoreTable.RankingPoints.Tie(
          match.redScore,
          match.blueScore
        );
        const isRedWin = match.redScore > match.blueScore;
        ranking.played = ranking.played + 1;
        ranking.wins =
          ranking.wins +
          (isTie ? 0 : isRed && isRedWin ? 1 : !isRed && !isRedWin ? 1 : 0);
        ranking.ties = ranking.ties + (isTie ? 1 : 0);
        ranking.losses =
          ranking.losses +
          (isTie ? 0 : isRed && isRedWin ? 0 : !isRed && !isRedWin ? 0 : 1);
        rankingMap.set(teamKey, ranking);
      }
    }
  }

  for (const teamKey of rankingMap.keys()) {
    const ranking = { ...(rankingMap.get(teamKey) as SeasonRanking) };
    const coopertitionPoints = coopertitionPointsMap.get(teamKey);
    const matchPoints = matchPointsMap.get(teamKey);
    const autoPoints = autoPointsMap.get(teamKey);
    const stagePoints = stagePointsMap.get(teamKey);
    const rankingPoints = rankingPointsMap.get(teamKey);

    if (
      typeof coopertitionPoints === 'undefined' ||
      typeof matchPoints === 'undefined' ||
      typeof autoPoints === 'undefined' ||
      typeof stagePoints === 'undefined' ||
      typeof rankingPoints === 'undefined' ||
      ranking.played <= 0
    ) {
      continue;
    }

    const avgCoopertitionPoints = coopertitionPoints / ranking.played;
    const avgMatchPoints = matchPoints / ranking.played;
    const avgAutoPoints = autoPoints / ranking.played;
    const avgStagePoints = stagePoints / ranking.played;
    const rankingScore =
      (rankingPoints + ranking.wins * 2 + ranking.ties) / ranking.played;

    rankingMap.set(teamKey, {
      ...ranking,
      avgCoopertitionPoints,
      avgAllianceMatchPoints: avgMatchPoints,
      avgAllianceAutoPoints: avgAutoPoints,
      avgAllianceStagePoints: avgStagePoints,
      rankingScore
    });
  }

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

// TODO - if EMS is ever used in 2024, this function will need to be updated.
function calculatePlayoffsRankings(
  matches: Match<MatchDetails>[],
  prevRankings: SeasonRanking[],
  members: AllianceMember[]
): SeasonRanking[] {
  return [];
}

export function calculateScore(match: Match<MatchDetails>): [number, number] {
  if (!match.details) return [0, 0];
  const [redAutoScore, blueAutoScore] = getAutoPoints(match);
  const [redTeleScore, blueTeleScore] = getTeleOpPoints(match);
  const [redStagePoints, blueStagePoints] = getStagePoints(match.details);
  const [redPenaltyScore, bluePenaltyScore] = getPenaltyPoints(
    match.redMinPen,
    match.redMajPen,
    match.blueMinPen,
    match.blueMajPen
  );
  const redScore =
    redAutoScore + redTeleScore + redStagePoints + redPenaltyScore;
  const blueScore =
    blueAutoScore + blueTeleScore + blueStagePoints + bluePenaltyScore;
  return [redScore, blueScore];
}

export function getMobilityPoints(status: number): number {
  return status === 1 ? ScoreTable.Auto.Mobility : 0;
}

export function getStageStatusPoints(status: StageStatus): number {
  switch (status) {
    case StageStatus.PARK:
      return ScoreTable.Stage.Park;
    case StageStatus.ONSTAGE:
      return ScoreTable.Stage.Onstage;
    case StageStatus.ONSTAGE_SPOTLIT:
      return ScoreTable.Stage.OnStageSpotlit;
    default:
      return 0;
  }
}

export function getAutoPoints(match: Match<MatchDetails>): [number, number] {
  const { details } = match;
  if (!details) return [0, 0];
  const redAutoPoints =
    details.redAutoAmpNotes * ScoreTable.Auto.AmpNote +
    details.redAutoSpeakerNotes * ScoreTable.Auto.SpeakerNote +
    getMobilityPoints(details.redAutoMobilityOne) +
    getMobilityPoints(details.redAutoMobilityTwo) +
    getMobilityPoints(details.redAutoMobilityThree);
  const blueAutoPoints =
    details.blueAutoAmpNotes * ScoreTable.Auto.AmpNote +
    details.blueAutoSpeakerNotes * ScoreTable.Auto.SpeakerNote +
    getMobilityPoints(details.blueAutoMobilityOne) +
    getMobilityPoints(details.blueAutoMobilityTwo) +
    getMobilityPoints(details.blueAutoMobilityThree);
  return [redAutoPoints, blueAutoPoints];
}

export function getTeleOpPoints(match: Match<MatchDetails>): [number, number] {
  const { details } = match;
  if (!details) return [0, 0];
  const redTelePoints =
    details.redTeleAmpNotes * ScoreTable.TeleOp.AmpNote +
    details.redTeleSpeakerNotes * ScoreTable.TeleOp.SpeakerNote +
    details.redTeleSpeakerNotesAmped * ScoreTable.TeleOp.SpeakerNoteAmped +
    details.redTeleTrapNotes * ScoreTable.Stage.TrapNote +
    details.redHarmonyStatus * ScoreTable.TeleOp.Harmony;
  const blueTelePoints =
    details.blueTeleAmpNotes * ScoreTable.TeleOp.AmpNote +
    details.blueTeleSpeakerNotes * ScoreTable.TeleOp.SpeakerNote +
    details.blueTeleSpeakerNotesAmped * ScoreTable.TeleOp.SpeakerNoteAmped +
    details.blueTeleTrapNotes * ScoreTable.Stage.TrapNote +
    details.blueHarmonyStatus * ScoreTable.TeleOp.Harmony;
  return [redTelePoints, blueTelePoints];
}

export function getStagePoints(
  details: MatchDetails | undefined
): [number, number] {
  if (!details) return [0, 0];
  const redStagePoints =
    getStageStatusPoints(details.redEndStageStatusOne) +
    getStageStatusPoints(details.redEndStageStatusTwo) +
    getStageStatusPoints(details.redEndStageStatusThree);
  const blueStagePoints =
    getStageStatusPoints(details.blueEndStageStatusOne) +
    getStageStatusPoints(details.blueEndStageStatusTwo) +
    getStageStatusPoints(details.blueEndStageStatusThree);
  return [redStagePoints, blueStagePoints];
}

export function getPenaltyPoints(
  redMinPen: number,
  redMajPen: number,
  blueMinPen: number,
  blueMajPen: number
): [number, number] {
  const redPenaltyPoints =
    blueMinPen * ScoreTable.Penalties.Foul +
    blueMajPen * ScoreTable.Penalties.TechFoul;
  const bluePenaltyPoints =
    redMinPen * ScoreTable.Penalties.Foul +
    redMajPen * ScoreTable.Penalties.TechFoul;
  return [redPenaltyPoints, bluePenaltyPoints];
}

export function getRankingPoints(details: MatchDetails): MatchDetails {
  // Calculate melody statuses
  const redNotes =
    details.redAutoAmpNotes +
    details.redAutoSpeakerNotes +
    details.redTeleAmpNotes +
    details.redTeleSpeakerNotes +
    details.redTeleSpeakerNotesAmped;
  const blueNotes =
    details.blueAutoAmpNotes +
    details.blueAutoSpeakerNotes +
    details.blueTeleAmpNotes +
    details.blueTeleSpeakerNotes +
    details.blueTeleSpeakerNotesAmped;
  const redMelodyStatus = ScoreTable.RankingPoints.Melody(
    redNotes,
    details.coopertitionBonus === 1
  );
  const blueMelodyStatus = ScoreTable.RankingPoints.Melody(
    blueNotes,
    details.coopertitionBonus === 1
  );

  // Calculate ensemble statuses
  const [redStagePoints, blueStagePoints] = getStagePoints(details);
  const redOnStageRobots =
    Number(details.redEndStageStatusOne > StageStatus.PARK) +
    Number(details.redEndStageStatusTwo > StageStatus.PARK) +
    Number(details.redEndStageStatusThree > StageStatus.PARK);
  const blueOnStageRobots =
    Number(details.blueEndStageStatusOne > StageStatus.PARK) +
    Number(details.blueEndStageStatusTwo > StageStatus.PARK) +
    Number(details.blueEndStageStatusThree > StageStatus.PARK);
  const redEnsembleStatus = ScoreTable.RankingPoints.Ensemble(
    redStagePoints,
    redOnStageRobots
  );
  const blueEnsembleStatus = ScoreTable.RankingPoints.Ensemble(
    blueStagePoints,
    blueOnStageRobots
  );
  const newDetails = Object.assign(
    {},
    {
      ...details,
      redMelodyStatus: redMelodyStatus ? 1 : 0,
      blueMelodyStatus: blueMelodyStatus ? 1 : 0,
      redEnsembleStatus: redEnsembleStatus ? 1 : 0,
      blueEnsembleStatus: blueEnsembleStatus ? 1 : 0
    }
  );
  return newDetails;
}

function compareRankings(a: SeasonRanking, b: SeasonRanking): number {
  if (a.rankingScore !== b.rankingScore) {
    return b.rankingScore - a.rankingScore;
  } else if (a.avgCoopertitionPoints !== b.avgCoopertitionPoints) {
    return b.avgCoopertitionPoints - a.avgCoopertitionPoints;
  } else if (a.avgAllianceMatchPoints !== b.avgAllianceMatchPoints) {
    return b.avgAllianceMatchPoints - a.avgCoopertitionPoints;
  } else if (a.avgAllianceAutoPoints !== b.avgAllianceAutoPoints) {
    return b.avgAllianceAutoPoints - a.avgAllianceAutoPoints;
  } else if (a.avgAllianceStagePoints !== b.avgAllianceStagePoints) {
    return b.avgAllianceStagePoints - a.avgAllianceStagePoints;
  } else {
    return randomInt(10) - randomInt(10);
  }
}
