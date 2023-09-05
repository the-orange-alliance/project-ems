import {
  Alliance,
  CarbonCaptureSeason,
  ChargedUpSeason,
  Match,
  MatchDetailBase
} from '@toa-lib/models';
import { FC, ChangeEvent } from 'react';
import { carbonCaptureComponents } from './CarbonCapture';
import { chargedUpComponents } from './ChargedUp';
import { HydrogenHorizonsSeason } from '@toa-lib/models/build/seasons/HydrogenHorizons';
import { hydrogenHorizonComponents } from './HydrogenHorizons';

// Add season components map here to be used in the function for later.
const seasonComponents = new Map<string, SeasonComponents<any>>();
seasonComponents.set(CarbonCaptureSeason.key, carbonCaptureComponents);
seasonComponents.set(ChargedUpSeason.key, chargedUpComponents);
seasonComponents.set(HydrogenHorizonsSeason.key, hydrogenHorizonComponents);

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

export interface SeasonComponents<T extends MatchDetailBase> {
  MatchDetailInfo: FC<MatchDetailInfoProps<T>>;
  RedScoreBreakdown: FC<ScoreBreakdownProps<T>>;
  BlueScoreBreakdown: FC<ScoreBreakdownProps<T>>;
  RefereeScoreSheet: FC<RefereeScoreSheetProps>;
}

export function getComponentsFromSeasonKey<T extends MatchDetailBase>(
  seasonKey: string
): SeasonComponents<T> | undefined {
  return seasonComponents.get(seasonKey);
}

export function useSeasonComponents<T extends MatchDetailBase>(
  seasonKey: string
): SeasonComponents<T> | undefined {
  return getComponentsFromSeasonKey(seasonKey);
}
