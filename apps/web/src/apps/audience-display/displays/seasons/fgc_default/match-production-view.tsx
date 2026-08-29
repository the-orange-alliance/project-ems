import { FC } from 'react';
import { getSeasonKeyFromEventKey } from '@toa-lib/models';
import { DisplayProps } from '../../displays.js';
import { MatchProduction2025 } from '../fgc_2025/index.js';
import { MatchProduction2026 } from '../fgc_2026/index.js';

/**
 * Season dispatcher for the production overlay. Picks the season-specific view by season
 * key, falling back to the 2025 view for every other current FGC key (the previous
 * behavior, since this component is wired up for all FGC seasons via `fgcDefault`).
 */
export const MatchProduction: FC<DisplayProps> = (props) => {
  const seasonKey =
    props.event?.seasonKey || getSeasonKeyFromEventKey(props.match.eventKey);

  switch (seasonKey) {
    case 'fgc_2026':
      return <MatchProduction2026 {...props} />;
    default:
      return <MatchProduction2025 {...props} />;
  }
};
