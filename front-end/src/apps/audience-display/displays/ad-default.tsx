import { FC } from 'react';
import { DisplayModeProps } from 'src/apps/audience-display/displays';
import { useRecoilValue } from 'recoil';
import { matchOccurringAtom, matchOccurringRanksAtom } from 'src/stores/recoil';
import { useEvent } from 'src/api/use-event-data';
import { AudienceScreens, Displays, LayoutMode } from '@toa-lib/models';
import { getDisplays } from './displays';
import {
  FadeInOut,
  SlideInBottom,
  SlideInLeft
} from 'src/components/animations';
import AbsolouteLocator from 'src/components/util/absoloute-locator';
import { useSearchParams } from 'react-router-dom';

/**
 * Classic audience display that handles all scenarios.
 */
export const AudDisplayDefault: FC<DisplayModeProps> = ({ id }) => {
  const match = useRecoilValue(matchOccurringAtom);
  const ranks = useRecoilValue(matchOccurringRanksAtom);
  const [searchParams] = useSearchParams();

  // Pin a display
  const pin = searchParams.get('pin');

  // Change which version of the display to use
  const layout =
    searchParams.get('layout')?.toLowerCase() ??
    `${LayoutMode.FULL}${LayoutMode.STREAM}${LayoutMode.FULL}`;

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
      case AudienceScreens.PREVIEW_STREAM:
        return (
          <displays.matchPreviewStream
            event={event}
            match={match}
            ranks={ranks}
          />
        );
      case AudienceScreens.MATCH:
        return <displays.matchPlay event={event} match={match} ranks={ranks} />;
      case AudienceScreens.RESULTS:
        return (
          <displays.matchResults event={event} match={match} ranks={ranks} />
        );
      case AudienceScreens.MATCH_STREAM:
        return (
          <displays.matchPlayStream event={event} match={match} ranks={ranks} />
        );
      case AudienceScreens.RESULTS_STREAM:
        return (
          <displays.matchResultsStream
            event={event}
            match={match}
            ranks={ranks}
          />
        );
    }
  }

  return (
    <>
      {/* Displays.BLANK (show nothing) */}
      {id === Displays.BLANK && <></>}

      {/* Displays.MATCH_PREVIEW */}
      {layout[0] === LayoutMode.FULL && (
        <AbsolouteLocator top={0} left={0}>
          <FadeInOut in={id === Displays.MATCH_PREVIEW} duration={0.5}>
            <displays.matchPreview event={event} match={match} ranks={ranks} />
          </FadeInOut>
        </AbsolouteLocator>
      )}
      {layout[0] === LayoutMode.STREAM && (
        <AbsolouteLocator bottom={0} left={0}>
          <SlideInBottom
            in={id === Displays.MATCH_PREVIEW}
            duration={0.75}
            inDelay={0.25}
          >
            <displays.matchPreviewStream
              event={event}
              match={match}
              ranks={ranks}
            />
          </SlideInBottom>
        </AbsolouteLocator>
      )}

      {/* Displays.MATCH_START */}
      {layout[1] === LayoutMode.FULL && (
        <AbsolouteLocator top={0} left={0}>
          <FadeInOut in={id === Displays.MATCH_START} duration={0.5}>
            <displays.matchPlay event={event} match={match} ranks={ranks} />
          </FadeInOut>
        </AbsolouteLocator>
      )}
      {layout[1] === LayoutMode.STREAM && (
        <AbsolouteLocator bottom={0} left={0}>
          <SlideInBottom
            in={id === Displays.MATCH_START}
            duration={0.75}
            inDelay={0.25}
          >
            <displays.matchPlayStream
              event={event}
              match={match}
              ranks={ranks}
            />
          </SlideInBottom>
        </AbsolouteLocator>
      )}

      {/* Displays.MATCH_RESULTS */}
      {layout[2] === LayoutMode.FULL && (
        <AbsolouteLocator top={0} left={0}>
          <FadeInOut in={id === Displays.MATCH_RESULTS}>
            <displays.matchResults event={event} match={match} ranks={ranks} />
          </FadeInOut>
        </AbsolouteLocator>
      )}
      {layout[2] === LayoutMode.STREAM && (
        <AbsolouteLocator top={0} left={0}>
          <SlideInLeft
            in={id === Displays.MATCH_RESULTS}
            duration={0.75}
            inDelay={0.25}
          >
            <displays.matchResultsStream
              event={event}
              match={match}
              ranks={ranks}
            />
          </SlideInLeft>
        </AbsolouteLocator>
      )}
    </>
  );
};
