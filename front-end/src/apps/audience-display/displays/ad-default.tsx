import { FC } from 'react';
import { DisplayProps } from 'src/apps/audience-display/displays';
import { MatchPreview } from './seasons/frc_default/match-preview';
import { useRecoilValue } from 'recoil';
import { matchOccurringAtom, matchOccurringRanksAtom } from 'src/stores/recoil';
import { useEvent } from 'src/api/use-event-data';
import { Displays } from '@toa-lib/models';
import { MatchPlay } from './seasons/frc_default/match-play';
import { MatchResults } from './seasons/frc_default/match-results';

/**
 * Classic audience display that handles all scenarios.
 */
export const AudDisplayDefault: FC<DisplayProps> = ({ eventKey, id }) => {
  // TODO - Is this how we want to handle the data flow?
  // TODO - Get rankings for teams in the match
  const { data: event } = useEvent(eventKey);
  const match = useRecoilValue(matchOccurringAtom);
  const ranks = useRecoilValue(matchOccurringRanksAtom);
  if (!match || !event || !ranks) return null;
  switch (id) {
    case Displays.BLANK:
      return null;
    case Displays.MATCH_PREVIEW:
      return <MatchPreview event={event} match={match} ranks={ranks} />;
    case Displays.MATCH_START:
      return <MatchPlay match={match} />;
    case Displays.MATCH_RESULTS:
      return <MatchResults event={event} match={match} ranks={ranks} />;
    default:
      return null;
  }
};
