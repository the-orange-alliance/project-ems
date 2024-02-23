import { Fragment } from 'react';
import MatchPlay from './MatchPlay/MatchPlay';
import MatchPreview from './MatchPreview/MatchPreview';
import MatchResults from './MatchResults/MatchResults';
import AudienceDisplayProvider from '../AudienceDisplayProvider';

export default Object.freeze({
  MatchPlay: MatchPlay,
  MatchPlayMini: MatchPlay,
  MatchPlayTimer: MatchPlay,
  MatchPreview: MatchPreview,
  MatchResults: MatchResults,
  MatchResultsOverlay: MatchResults,
  Rankings: Fragment, // doesn't exist
  RankingsPlayoffs: Fragment // doesn't exist
}) as AudienceDisplayProvider;
