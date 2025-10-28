import { AllianceMember } from '../base/Alliance.js';
import { Match, MatchDetailBase } from '../base/Match.js';
import { Ranking } from '../base/Ranking.js';
import { CarbonCaptureSeason } from './CarbonCapture.js';
import { ChargedUpSeason } from './ChargedUp.js';
// import { CrescendoSeason } from './Crescendo.js';
import { FeedingTheFutureSeason } from './FeedingTheFuture.js';
import { HydrogenHorizonsSeason } from './HydrogenHorizons.js';
import { EcoEquilibriumSeason } from './FGC25_EcoEquilibrium.js'

export * from './CarbonCapture.js';
export * from './ChargedUp.js';
export * as HydrogenHorizons from './HydrogenHorizons.js';
export * as Crescendo from './Crescendo.js';
export * as FeedingTheFuture from './FeedingTheFuture.js';
export * as EcoEquilibrium from './FGC25_EcoEquilibrium.js';

export interface Season<T extends MatchDetailBase, J extends Ranking> {
  key: string;
  name: string;
  program: string;
  defaultMatchDetails: T;
  functions?: SeasonFunctions<T, J>;
}

export const Seasons: Season<any, any>[] = [
  CarbonCaptureSeason,
  ChargedUpSeason,
  HydrogenHorizonsSeason,
  // CrescendoSeason,
  FeedingTheFutureSeason,
  EcoEquilibriumSeason
];

export interface SeasonFunctions<T extends MatchDetailBase, J extends Ranking> {
  calculateRankings: (matches: Match<T>[], prevRankings: J[]) => J[];
  calculatePlayoffsRankings?: (
    matches: Match<T>[],
    prevRankings: J[],
    members: AllianceMember[]
  ) => J[];
  calculateScore: (match: Match<T>, matchInProgress?: boolean) => [number, number];
  calculateRankingPoints?: (details: T) => T;
  calculateAutoScore?: (match: Match<T>) => [number, number];
  calculateTeleScore?: (match: Match<T>) => [number, number];
  calculateEndScore?: (match: Match<T>) => [number, number];
  detailsToJson?: (details: T) => any;
  detailsFromJson?: (json?: any) => T | undefined;
}

export function getFunctionsBySeasonKey<
  T extends MatchDetailBase,
  J extends Ranking
>(seasonKey: string): SeasonFunctions<T, J> | undefined {
  return Seasons.find((s) => s.key === seasonKey)?.functions;
}

export function getDefaultMatchDetailsBySeasonKey<T extends MatchDetailBase>(
  seasonKey: string
): T | undefined {
  return Seasons.find((s) => s.key === seasonKey)?.defaultMatchDetails;
}

export function getSeasonKeyFromEventKey(eventKey: string): string {
  return eventKey.split('-')[0].toLowerCase();
}
