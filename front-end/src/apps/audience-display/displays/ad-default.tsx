import { FC } from 'react';
import { DisplayProps } from 'src/apps/audience-display/displays';
import { MatchPreview } from './seasons/frc_default/match-preview';
import { useRecoilValue } from 'recoil';
import { matchOccurringAtom } from 'src/stores/recoil';
import { useEvent } from 'src/api/use-event-data';

/**
 * Classic audience display that handles all scenarios.
 */
export const AudDisplayDefault: FC<DisplayProps> = ({ eventKey }) => {
  // TODO - Is this how we want to handle the data flow?
  // TODO - Get rankings for teams in the match
  const { data: event } = useEvent(eventKey);
  const match = useRecoilValue(matchOccurringAtom);
  return match && event ? <MatchPreview event={event} match={match} /> : null;
};
