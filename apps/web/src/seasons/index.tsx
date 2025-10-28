import {
  Alliance,
  FeedingTheFuture,
  Match,
  MatchDetailBase,
  Ranking,
  EcoEquilibrium
} from '@toa-lib/models';
import { FC, ChangeEvent } from 'react';
import { fgc2024Components } from './fgc-2024/index.js';
import { fgc2025Components } from './fgc-2025/index.js';

const { FeedingTheFutureSeason } = FeedingTheFuture;
const { EcoEquilibriumSeason } = EcoEquilibrium;

// Add season components map here to be used in the function for later.
const seasonComponents = new Map<string, SeasonComponents<any, any>>();
seasonComponents.set(FeedingTheFutureSeason.key, fgc2024Components);
seasonComponents.set(EcoEquilibriumSeason.key, fgc2025Components);

/**
 * @deprecated Use `ScoreBreakdownProps` instead.
 */
export interface MatchDetailInfoProps<T extends MatchDetailBase> {
  match?: Match<T>;
  handleUpdates: (e: ChangeEvent<HTMLInputElement>) => void;
}

export interface ScoreBreakdownProps<T extends MatchDetailBase> {
  match?: Match<T>;
  disabled?: boolean;
  handleUpdates?: (key: keyof T, value: any) => void;
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
  MatchDetailInfo?: FC<MatchDetailInfoProps<T>>;
  RedScoreBreakdown?: FC<ScoreBreakdownProps<T>>;
  BlueScoreBreakdown?: FC<ScoreBreakdownProps<T>>;
  CustomBreakdown?: FC<ScoreBreakdownProps<T>>;
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
