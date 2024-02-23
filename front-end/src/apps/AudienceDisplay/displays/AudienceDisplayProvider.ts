import { FC } from 'react';

export type AudienceDisplayProps = {
  visible?: boolean;
};

type AudienceDisplayProvider = {
  MatchPlay: FC<AudienceDisplayProps>;
  MatchPlayMini: FC<AudienceDisplayProps>;
  MatchPlayTimer: FC<AudienceDisplayProps>;
  MatchPreview: FC<AudienceDisplayProps>;
  MatchResults: FC<AudienceDisplayProps>;
  MatchResultsOverlay: FC<AudienceDisplayProps>;
  Rankings: FC<AudienceDisplayProps>;
  RankingsPlayoffs: FC<AudienceDisplayProps>;
};

export default AudienceDisplayProvider;
