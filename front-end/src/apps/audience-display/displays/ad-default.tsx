import { FC } from 'react';
import { DisplayModeProps } from 'src/apps/audience-display/displays';
import { useRecoilValue } from 'recoil';
import { matchOccurringAtom, matchOccurringRanksAtom } from 'src/stores/recoil';
import { useEvent } from 'src/api/use-event-data';
import { AudienceScreens, Displays } from '@toa-lib/models';
import { getDisplays } from './displays';
import { FadeInOut, SlideInBottom } from 'src/components/animations';
import AbsolouteLocator from 'src/components/util/absoloute-locator';
import { useSearchParams } from 'react-router-dom';

/**
 * Classic audience display that handles all scenarios.
 */
export const AudDisplayDefault: FC<DisplayModeProps> = ({ id }) => {
  const match = useRecoilValue(matchOccurringAtom);
  const ranks = useRecoilValue(matchOccurringRanksAtom);
  const [searchParams] = useSearchParams();
  const pin = searchParams.get('pin');
  // Make sure you use the event key from the match to make sure we get the correct event, not
  // the one loaded from the url.
  const { data: event } = useEvent(match?.eventKey);
  const displays = getDisplays(event?.seasonKey || '');
  // TODO - Have better error handling here.
  if (!match || !event || !ranks || !displays) return null;

  // Handle "pinning" screens
  if (pin && typeof pin === 'string') {
    switch (pin) {
      case AudienceScreens.PREVIEW:
        return (
          <displays.matchPreview event={event} match={match} ranks={ranks} />
        );
      case AudienceScreens.MATCH_FULL:
        return <displays.matchPlay event={event} match={match} ranks={ranks} />;
      case AudienceScreens.RESULTS:
        return (
          <displays.matchResults event={event} match={match} ranks={ranks} />
        );
      case AudienceScreens.MATCH_STREAM:
        return <displays.matchPlayStream event={event} match={match} ranks={ranks} />;
      case AudienceScreens.RESULTS_STREAM:
        return (
          <displays.matchResultsStream event={event} match={match} ranks={ranks} />
        );
    }
  }

  return (
    <>
      {/* Displays.BLANK (show nothing) */}
      {id === Displays.BLANK && <></>}

      {/* Displays.MATCH_PREVIEW */}
      <AbsolouteLocator top={0} left={0}>
        <FadeInOut in={id === Displays.MATCH_PREVIEW} duration={0.5}>
          <displays.matchPreview event={event} match={match} ranks={ranks} />
        </FadeInOut>
      </AbsolouteLocator>

      {/* Displays.MATCH_START */}
      <SlideInBottom
        in={id === Displays.MATCH_START}
        duration={0.75}
        inDelay={0.25}
      >
        <displays.matchPlay event={event} match={match} ranks={ranks} />
      </SlideInBottom>

      {/* Displays.MATCH_RESULTS */}
      <AbsolouteLocator top={0} left={0}>
        <FadeInOut in={id === Displays.MATCH_RESULTS}>
          <displays.matchResults event={event} match={match} ranks={ranks} />
        </FadeInOut>
      </AbsolouteLocator>
    </>
  );
};
