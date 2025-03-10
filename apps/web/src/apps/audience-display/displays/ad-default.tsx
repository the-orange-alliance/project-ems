import { FC } from 'react';
import { DisplayModeProps } from 'src/apps/audience-display/displays';
import { useRecoilValue } from 'recoil';
import {
  matchOccurringAtom,
  matchOccurringRanksAtom,
  matchResultsMatchAtom,
  matchResultsRanksAtom,
  matchStateAtom
} from 'src/stores/recoil';
import { useEvent } from 'src/api/use-event-data';
import {
  AudienceScreens,
  Displays,
  LayoutMode,
  MatchState
} from '@toa-lib/models';
import { getDisplays } from './displays';
import {
  FadeInOut,
  SlideInBottom,
  SlideInLeft
} from 'src/components/animations';
import AbsolouteLocator from 'src/components/util/absoloute-locator';
import { useSearchParams } from 'react-router-dom';
import { useTeamsForEvent } from 'src/api/use-team-data';

/**
 * Classic audience display that handles all scenarios.
 */
export const AudDisplayDefault: FC<DisplayModeProps> = ({ id }) => {
  const match = useRecoilValue(matchOccurringAtom);
  const matchResultsMatch = useRecoilValue(matchResultsMatchAtom);
  const ranks = useRecoilValue(matchOccurringRanksAtom);
  const matchResultsRanks = useRecoilValue(matchResultsRanksAtom);
  const matchState = useRecoilValue(matchStateAtom);
  const [searchParams] = useSearchParams();

  const { data: teams } = useTeamsForEvent(match?.eventKey);

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
        return (
          <displays.matchPlay
            event={event}
            match={match}
            ranks={ranks}
            teams={teams}
          />
        );
      case AudienceScreens.RESULTS:
        return (
          <displays.matchResults
            event={event}
            match={match}
            ranks={ranks}
            teams={teams}
          />
        );
      case AudienceScreens.MATCH_STREAM:
        return (
          <displays.matchPlayStream
            event={event}
            match={matchResultsMatch ?? match}
            ranks={ranks}
            teams={teams}
          />
        );
      case AudienceScreens.RESULTS_STREAM:
        return (
          <displays.matchResultsStream
            event={event}
            match={matchResultsMatch ?? match}
            ranks={ranks}
            teams={teams}
          />
        );
    }
  }
  const afterMatchBeforeScore =
    matchState > MatchState.MATCH_IN_PROGRESS &&
    matchState < MatchState.RESULTS_POSTED;

  const showRanks = matchState < MatchState.MATCH_IN_PROGRESS;

  const showPreviewFull =
    layout[0] === LayoutMode.FULL || layout[1] === LayoutMode.FULL;

  // show the stream results during the preview
  const showStreamResultsDuringPreview =
    layout[2] === LayoutMode.STREAM &&
    layout[0] === LayoutMode.RESULTS &&
    id === Displays.MATCH_PREVIEW;

  // show the full results during the preview
  const showFullResultsDuringPreview =
    layout[2] === LayoutMode.FULL &&
    layout[0] === LayoutMode.RESULTS &&
    id === Displays.MATCH_PREVIEW;

  // force hide the preview if we are showing the results
  const forceHidePreview =
    showStreamResultsDuringPreview || showFullResultsDuringPreview;

  const resultsToUse = !matchResultsMatch ? match : matchResultsMatch;
  const ranksToUse = !matchResultsRanks ? ranks : matchResultsRanks;

  return (
    <>
      {/* Displays.BLANK (show nothing) */}
      {id === Displays.BLANK && <></>}

      {/* Displays.MATCH_PREVIEW */}
      {showPreviewFull && (
        <AbsolouteLocator top={0} left={0}>
          <FadeInOut
            in={
              // if we are showing the preview full and we are not showing the results
              (id === Displays.MATCH_PREVIEW && !forceHidePreview) ||
              afterMatchBeforeScore
            }
            duration={0.5}
          >
            <displays.matchPreview
              event={event}
              match={match}
              ranks={showRanks ? ranks : []}
              teams={teams}
            />
          </FadeInOut>
        </AbsolouteLocator>
      )}
      {layout[0] === LayoutMode.STREAM && (
        <AbsolouteLocator bottom={0} left={0}>
          <SlideInBottom
            in={id === Displays.MATCH_PREVIEW && !forceHidePreview}
            duration={1.25}
            inDelay={0.75}
          >
            <displays.matchPreviewStream
              event={event}
              match={match}
              ranks={ranks}
              teams={teams}
            />
          </SlideInBottom>
        </AbsolouteLocator>
      )}

      {/* Displays.MATCH_START */}
      {layout[1] === LayoutMode.FULL && (
        <AbsolouteLocator top={0} left={0}>
          <FadeInOut
            in={id === Displays.MATCH_START && !afterMatchBeforeScore}
            duration={0.5}
          >
            <displays.matchPlay
              event={event}
              match={match}
              ranks={ranks}
              teams={teams}
            />
          </FadeInOut>
        </AbsolouteLocator>
      )}
      {layout[1] === LayoutMode.STREAM && (
        <AbsolouteLocator bottom={0} left={0}>
          <SlideInBottom
            in={id === Displays.MATCH_START && !afterMatchBeforeScore}
            duration={1.25}
            inDelay={0.75}
          >
            <displays.matchPlayStream
              event={event}
              match={match}
              ranks={ranks}
              teams={teams}
            />
          </SlideInBottom>
        </AbsolouteLocator>
      )}

      {/* Displays.MATCH_RESULTS */}
      {layout[2] === LayoutMode.FULL && (
        <AbsolouteLocator top={0} left={0}>
          <FadeInOut
            in={id === Displays.MATCH_RESULTS || showFullResultsDuringPreview}
          >
            <displays.matchResults
              event={event}
              match={resultsToUse}
              ranks={ranksToUse}
              teams={teams}
            />
          </FadeInOut>
        </AbsolouteLocator>
      )}
      {layout[2] === LayoutMode.STREAM && matchResultsMatch && (
        <AbsolouteLocator top={0} left={0}>
          <SlideInLeft
            in={id === Displays.MATCH_RESULTS || showStreamResultsDuringPreview}
            duration={1.25}
            inDelay={0.75}
          >
            <displays.matchResultsStream
              event={event}
              match={resultsToUse}
              ranks={ranksToUse}
              teams={teams}
            />
          </SlideInLeft>
        </AbsolouteLocator>
      )}
    </>
  );
};
