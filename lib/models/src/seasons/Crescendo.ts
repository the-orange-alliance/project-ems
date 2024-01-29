import { MatchDetailBase } from '../Match.js';
import { Ranking } from '../Ranking.js';
import { Season, SeasonFunctions } from './index.js';

/**
 * Main season function declaration for the whole file.
 */
const functions: SeasonFunctions<MatchDetails, SeasonRanking> = {
  calculateRankings,
  calculatePlayoffsRankings,
  calculateScore
};

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
  avgAllianceStagePoints: number;
}

export const CrescendoSeason: Season<MatchDetails, SeasonRanking> = {
  key: 'frc_2024',
  program: 'frc',
  name: 'Crescendo',
  defaultMatchDetails,
  functions
};
