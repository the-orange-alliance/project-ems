import {
  Alliance,
  ChargedUpSeason,
  HydrogenHorizons,
  Crescendo,
  FeedingTheFuture,
  Match,
  MatchDetailBase,
  Ranking,
  EcoEquilibrium
} from '@toa-lib/models';
import { FC, ChangeEvent } from 'react';
import { chargedUpComponents } from './ChargedUp/index.js';
import { hydrogenHorizonComponents } from './HydrogenHorizons/index.js';
import { crescendoComponents } from './Crescendo/index.js';
import { fgc2024Components } from './fgc-2024/index.js';
import { ecoEquilibriumComponents } from './EcoEquilibrium/index.js';

const { HydrogenHorizonsSeason } = HydrogenHorizons;
const { CrescendoSeason } = Crescendo;
const { FeedingTheFutureSeason } = FeedingTheFuture;
const { EcoEquilibriumSeason} = EcoEquilibrium;

// Add season components map here to be used in the function for later.
const seasonComponents = new Map<string, SeasonComponents<any, any>>();
seasonComponents.set(ChargedUpSeason.key, chargedUpComponents);
seasonComponents.set(HydrogenHorizonsSeason.key, hydrogenHorizonComponents);
seasonComponents.set(CrescendoSeason.key, crescendoComponents);
seasonComponents.set(FeedingTheFutureSeason.key, fgc2024Components);
seasonComponents.set(EcoEquilibriumSeason.key, ecoEquilibriumComponents);

export interface MatchDetailInfoProps<T extends MatchDetailBase> {
  match?: Match<T>;
  handleUpdates: (e: ChangeEvent<HTMLInputElement>) => void;
}

export interface ScoreBreakdownProps<T extends MatchDetailBase> {
  match?: Match<T>;
}

export interface RefereeScoreSheetProps {
  alliance: Alliance;
}

export interface RankingsReportProps<T extends Ranking> {
  rankings: T[];
}

export interface FieldControlCallbacks<T extends MatchDetailBase> {
  prestartField?: () => void;
  cancelPrestartForField?: () => void;
  prepareField?: () => void;
  startField?: () => void;
  abortField?: () => void;
  clearField?: () => void;
  commitScoresForField?: () => void;
  postResultsForField?: () => void;
  onMatchUpdate?: (match: T) => void;
  updateFieldSettings: () => void;
  awardsMode?: () => void;
}

export interface SeasonComponents<
  T extends MatchDetailBase,
  U extends Ranking
> {
  Settings?: FC;
  MatchDetailInfo: FC<MatchDetailInfoProps<T>>;
  RedScoreBreakdown: FC<ScoreBreakdownProps<T>>;
  BlueScoreBreakdown: FC<ScoreBreakdownProps<T>>;
  RefereeScoreSheet: FC<RefereeScoreSheetProps>;
  HeadRefExtrasSheet?: FC;
  RankingsReport?: FC<RankingsReportProps<U>>;
  useFieldControl?: () => FieldControlCallbacks<T>;
}

export function getComponentsFromSeasonKey<
  T extends MatchDetailBase,
  U extends Ranking
>(seasonKey: string | undefined): SeasonComponents<T, U> | undefined {
  return seasonKey ? seasonComponents.get(seasonKey) : undefined;
}

export function useComponents<T extends MatchDetailBase, U extends Ranking>(
  seasonKey: string | undefined
): SeasonComponents<T, U> | undefined {
  return getComponentsFromSeasonKey(seasonKey);
}

export function useFieldControl<T extends MatchDetailBase>(
  seasonKey: string | undefined
): FieldControlCallbacks<T> | undefined {
  const components = getComponentsFromSeasonKey<T, any>(seasonKey);
  return components?.useFieldControl?.();
}
