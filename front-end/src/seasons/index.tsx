import {
  CarbonCaptureSeason,
  ChargedUpSeason,
  Match,
  MatchDetailBase
} from '@toa-lib/models';
import { FC, ChangeEvent } from 'react';
import { carbonCaptureComponents } from './CarbonCapture';
import { chargedUpComponents } from './ChargedUp';

// Add season components map here to be used in the function for later.
const seasonComponents = new Map<string, SeasonComponents<any>>();
seasonComponents.set(CarbonCaptureSeason.key, carbonCaptureComponents);
seasonComponents.set(ChargedUpSeason.key, chargedUpComponents);

export interface MatchDetailInfoProps<T extends MatchDetailBase> {
  match?: Match<T>;
  handleUpdates: (e: ChangeEvent<HTMLInputElement>) => void;
}

export interface SeasonComponents<T extends MatchDetailBase> {
  MatchDetailInfo: FC<MatchDetailInfoProps<T>>;
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
