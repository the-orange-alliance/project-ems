import { Match, MatchDetailBase } from '../Match.js';
import { Ranking } from '../Ranking.js';
import { CarbonCaptureSeason } from './CarbonCapture.js';
import { ChargedUpSeason } from './ChargedUp.js';
import { HydrogenHorizonsSeason } from './HydrogenHorizons.js';

export * from './CarbonCapture.js';
export * from './ChargedUp.js';
export * as HydrogenHorizons from './HydrogenHorizons.js';

export interface Season<T extends MatchDetailBase, J extends Ranking> {
  key: string;
  name: string;
  program: string;
  functions?: SeasonFunctions<T, J>;
}

export const Seasons: Season<any, any>[] = [
  CarbonCaptureSeason,
  ChargedUpSeason,
  HydrogenHorizonsSeason
];

export interface SeasonFunctions<T extends MatchDetailBase, J extends Ranking> {
  calculateRankings: (matches: Match<T>[], prevRankings: J[]) => J[];
  calculateScore: (match: Match<T>) => [number, number];
  calculateRankingPoints?: (details: T) => T;
  calculateAutoScore?: (match: Match<T>) => [number, number];
  calculateTeleScore?: (match: Match<T>) => [number, number];
  calculateEndScore?: (match: Match<T>) => [number, number];
}

export function getFunctionsBySeasonKey<
  T extends MatchDetailBase,
  J extends Ranking
>(seasonKey: string): SeasonFunctions<T, J> | undefined {
  return Seasons.find((s) => s.key === seasonKey)?.functions;
}

export function getSeasonKeyFromEventKey(eventKey: string): string {
  return eventKey.split('-')[0].toLowerCase();
}
