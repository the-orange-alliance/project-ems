import {
  Alliance,
  ChargedUpSeason,
  Match,
  MatchDetailBase,
  Ranking
} from '@toa-lib/models';
import { FC, ChangeEvent } from 'react';
import { chargedUpComponents } from './ChargedUp';
import { HydrogenHorizonsSeason } from '@toa-lib/models/build/seasons/HydrogenHorizons';
import { hydrogenHorizonComponents } from './HydrogenHorizons';
import { crescendoComponents } from './Crescendo';

import { CrescendoSeason } from '@toa-lib/models/build/seasons/Crescendo';

// Add season components map here to be used in the function for later.
const seasonComponents = new Map<string, SeasonComponents<any, any>>();
seasonComponents.set(ChargedUpSeason.key, chargedUpComponents);
seasonComponents.set(HydrogenHorizonsSeason.key, hydrogenHorizonComponents);
seasonComponents.set(CrescendoSeason.key, crescendoComponents);

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
export interface SeasonComponents<
  T extends MatchDetailBase,
  U extends Ranking
> {
  Settings?: FC;
  MatchDetailInfo: FC<MatchDetailInfoProps<T>>;
  RedScoreBreakdown: FC<ScoreBreakdownProps<T>>;
  BlueScoreBreakdown: FC<ScoreBreakdownProps<T>>;
  RefereeScoreSheet: FC<RefereeScoreSheetProps>;
  RankingsReport?: FC<RankingsReportProps<U>>;
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
