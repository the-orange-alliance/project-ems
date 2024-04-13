import { FC } from 'react';
import { DisplayModeProps } from 'src/apps/audience-display/displays';
import { useRecoilValue } from 'recoil';
import { matchOccurringAtom, matchOccurringRanksAtom } from 'src/stores/recoil';
import { useEvent } from 'src/api/use-event-data';
import { Displays } from '@toa-lib/models';
import { getDisplays } from './displays';

/**
 * Classic audience display that handles all scenarios.
 */
export const AudDisplayDefault: FC<DisplayModeProps> = ({ id }) => {
  const match = useRecoilValue(matchOccurringAtom);
  const ranks = useRecoilValue(matchOccurringRanksAtom);
  // Make sure you use the event key from the match to make sure we get the correct event, not
  // the one loaded from the url.
  const { data: event } = useEvent(match?.eventKey);
  const displays = getDisplays(event?.seasonKey || '');
  // TODO - Have better error handling here.
  if (!match || !event || !ranks || !displays) return null;
  switch (id) {
    case Displays.BLANK:
    case Displays.MATCH_PREVIEW:
      return (
        <displays.matchPreview event={event} match={match} ranks={ranks} />
      );
    case Displays.MATCH_START:
      return <displays.matchPlay event={event} match={match} ranks={ranks} />;
    case Displays.MATCH_RESULTS:
      return (
        <displays.matchResults event={event} match={match} ranks={ranks} />
      );
    default:
      return null;
  }
};
