import { FC } from 'react';
import { Event, Match, MatchDetailBase, Ranking, Team } from '@toa-lib/models';
import * as FRCDefault from './seasons/frc_default';
import * as FGCDefault from './seasons/fgc_default';

export interface DisplayProps {
  event: Event;
  match: Match<any>;
  ranks: Ranking[];
  teams?: Team[];
}

export interface ResultsBreakdown<T extends MatchDetailBase> {
  icon: React.ReactNode;
  title: string;
  color: string;
  resultCalc: (match: Match<T>, alliance: 'red' | 'blue') => string;
}

interface SeasonDisplay {
  matchPreview: FC<DisplayProps>;
  matchPreviewStream: FC<DisplayProps>;
  matchPlay: FC<DisplayProps>;
  matchPlayStream: FC<DisplayProps>;
  matchResults: FC<DisplayProps>;
  matchResultsStream: FC<DisplayProps>;
}

export const frcDefault: SeasonDisplay = {
  matchPreview: FRCDefault.MatchPreview,
  matchPreviewStream: FRCDefault.MatchPreview,
  matchPlay: FRCDefault.MatchPlay,
  matchPlayStream: FRCDefault.MatchPlay,
  matchResults: FRCDefault.MatchResults,
  matchResultsStream: FRCDefault.MatchResults
};

export const fgcDefault: SeasonDisplay = {
  matchPreview: FGCDefault.MatchPreview,
  matchPreviewStream: FGCDefault.MatchPreviewStream,
  matchPlay: FGCDefault.MatchPlay,
  matchPlayStream: FGCDefault.MatchPlayStream,
  matchResults: FGCDefault.MatchResults,
  matchResultsStream: FGCDefault.MatchResultsStream
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
