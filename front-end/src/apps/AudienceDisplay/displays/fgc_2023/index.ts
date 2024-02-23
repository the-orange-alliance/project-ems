import AudienceDisplayProvider from '../AudienceDisplayProvider';
import MatchPlay from './MatchPlay/MatchPlay';
import MatchPlayMini from './MatchPlayMini/MatchPlayMini';
import MatchPlayTimer from './MatchPlayTimer/MatchPlayTimer';
import MatchPreview from './MatchPreview/MatchPreview';
import MatchResults from './MatchResults/MatchResults';
import MatchResultsOverlay from './MatchResults/MatchResultsOverlay';
import Rankings from './Rankings/Rankings';
import RankingsPlayoffs from './RankingsPlayoffs/RankingsPlayoff';

export default Object.freeze({
  MatchPlay: MatchPlay,
  MatchPlayMini: MatchPlayMini,
  MatchPlayTimer: MatchPlayTimer,
  MatchPreview: MatchPreview,
  MatchResults: MatchResults,
  MatchResultsOverlay: MatchResultsOverlay,
  Rankings: Rankings,
  RankingsPlayoffs: RankingsPlayoffs
}) as AudienceDisplayProvider;
