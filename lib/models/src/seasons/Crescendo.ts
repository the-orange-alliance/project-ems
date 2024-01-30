import { randomInt } from 'crypto';
import { AllianceMember } from '../Alliance.js';
import { Match, MatchDetailBase } from '../Match.js';
import { Ranking } from '../Ranking.js';
import { isNonNullObject, isNumber, UnreachableError } from '../types.js';
import { Season, SeasonFunctions } from './index.js';

/**
 * Main season function declaration for the whole file.
 */
const functions: SeasonFunctions<MatchDetails, SeasonRanking> = {
  calculateRankings,
  calculatePlayoffsRankings,
  calculateScore
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
  redEndStageStatusOne: number;
  redEndStageStatusTwo: number;
  redEndStageStatusThree: number;
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
  blueEndStageStatusOne: number;
  blueEndStageStatusTwo: number;
  blueEndStageStatusThree: number;
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
  return [];
}

function calculatePlayoffsRankings(
  matches: Match<MatchDetails>[],
  prevRankings: SeasonRanking[],
  members: AllianceMember[]
): SeasonRanking[] {
  return [];
}

function calculateScore(match: Match<MatchDetails>): [number, number] {
  return [0, 0];
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
