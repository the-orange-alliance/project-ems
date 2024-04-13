import { FC } from 'react';
import { Event, Match, Ranking } from '@toa-lib/models';
import * as FRCDefault from './seasons/frc_default';
import * as FGCDefault from './seasons/fgc_default';

export interface DisplayProps {
  event: Event;
  match: Match<any>;
  ranks: Ranking[];
}

interface SeasonDisplay {
  matchPreview: FC<DisplayProps>;
  matchPlay: FC<DisplayProps>;
  matchResults: FC<DisplayProps>;
}

export const frcDefault: SeasonDisplay = {
  matchPlay: FRCDefault.MatchPlay,
  matchPreview: FRCDefault.MatchPreview,
  matchResults: FRCDefault.MatchResults
};

export const fgcDefault: SeasonDisplay = {
  matchPlay: FGCDefault.MatchPlay,
  matchPreview: FGCDefault.MatchPreview,
  matchResults: FGCDefault.MatchResults
};

// Map that contains all the displays for their seasons.
export const displayMap: Map<string, SeasonDisplay> = new Map();
displayMap.set('frc_default', frcDefault);
displayMap.set('fgc_default', fgcDefault);

const getDefaultDisplay = (seasonKey: string): SeasonDisplay => {
  const program = seasonKey.substring(0, 3);
  if (program === 'frc') {
    return frcDefault;
  } else if (program === 'fgc') {
    return fgcDefault;
  }
  return frcDefault;
};

export const getDisplays = (seasonKey: string): SeasonDisplay => {
  const displays = displayMap.get(seasonKey);
  return displays ? displays : getDefaultDisplay(seasonKey);
};
