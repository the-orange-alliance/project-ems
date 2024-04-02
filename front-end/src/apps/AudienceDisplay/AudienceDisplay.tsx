import { clientFetcher } from '@toa-lib/client';
import {
  Displays,
  getSeasonKeyFromEventKey,
  isMatch,
  Match,
  MatchKey,
  MatchSocketEvent
} from '@toa-lib/models';
import { useParams, useSearchParams } from 'react-router-dom';
import { FC, Fragment, Suspense, useEffect, useRef } from 'react';
import { useRecoilCallback, useRecoilState } from 'recoil';
import { useSocket } from 'src/api/use-socket';
import MatchStateListener from 'src/components/sync-effects/MatchStateListener/MatchStateListener';
import PrestartListener from 'src/components/sync-effects/PrestartListener/PrestartListener';
import ChromaLayout from 'src/layouts/ChromaLayout';
import {
  displayChromaKeyAtom,
  displayIdAtom,
  matchResultAtom
} from 'src/stores/NewRecoil';

import Rankings from './displays/fgc_2023/Rankings/Rankings';
import { useHiddenMotionlessCursor } from 'src/hooks/use-hidden-motionless-cursor';
import './AudienceDisplay.less';
import { updateSocketClient } from 'src/api/use-socket-data';
import RankingsPlayoffs from './displays/fgc_2023/RankingsPlayoffs/RankingsPlayoff';
import AudienceDisplayProvider from './displays/AudienceDisplayProvider';

// Seasons
import FRC2023 from './displays/frc_2023';
import FRC2024 from './displays/frc_2024';
import FGC2023 from './displays/fgc_2023';

const AudienceDisplay: FC = () => {
  const [display, setDisplay] = useRecoilState(displayIdAtom);
  const [chromaKey, setChromaKey] = useRecoilState(displayChromaKeyAtom);
  const [socket, connected] = useSocket();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') ?? '';
  const delay = searchParams.get('delay') ?? '15000';
  let paramChroma = searchParams.get('chroma');

  const { eventKey } = useParams();
  const seasonKey = getSeasonKeyFromEventKey(eventKey ?? '');

  useHiddenMotionlessCursor();

  useEffect(() => {
    if (paramChroma && paramChroma !== chromaKey) {
      if (paramChroma.length === 6) paramChroma = '#' + paramChroma;
      setChromaKey(paramChroma);
      updateSocketClient(localStorage.getItem('persistantClientId') ?? '', {
        audienceDisplayChroma: paramChroma
      });
    }
  }, []);

  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.DISPLAY, onDisplay);
      socket?.on(MatchSocketEvent.COMMIT, onCommit);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener(MatchSocketEvent.DISPLAY, onDisplay);
      socket?.removeListener(MatchSocketEvent.COMMIT, onCommit);
    };
  }, [display]);

  const timerId = useRef<NodeJS.Timer | null>(null);

  useEffect(() => {
    if (mode === 'stream') {
      if (display === Displays.MATCH_START && timerId.current) {
        clearTimeout(timerId.current);
        timerId.current = null;
      } else {
        if (timerId.current) return;
        timerId.current = setTimeout(() => {
          if (display !== Displays.MATCH_START) {
            setDisplay(Displays.BLANK);
          }
          if (timerId.current) {
            clearTimeout(timerId.current);
            timerId.current = null;
          }
        }, parseInt(delay));
      }
    }
  }, [display, setDisplay]);

  const onDisplay = (id: number) => {
    setDisplay(id);
  };

  const onCommit = useRecoilCallback(({ set }) => async (key: MatchKey) => {
    const match: Match<any> = await clientFetcher(
      `match/all/${key.eventKey}/${key.tournamentKey}/${key.id}`,
      'GET',
      undefined,
      isMatch
    );
    set(matchResultAtom, match);
  });

  return (
    <Suspense
      fallback={
        <div
          style={{
            position: 'absolute',
            height: '100vh',
            width: '100vw',
            backgroundColor: 'rgba(0,0,0,0)'
          }}
        />
      }
    >
      <ChromaLayout>
        <MatchStateListener />
        <PrestartListener />
        <div id='aud-base' style={{ backgroundColor: chromaKey }}>
          {mode === 'pit' ? (
            <RankingsPlayoffs />
          ) : (
            <DisplaySwitcher id={display} mode={mode} seasonKey={seasonKey} />
          )}
        </div>
      </ChromaLayout>
    </Suspense>
  );
};

export default AudienceDisplay;

interface IProps {
  id: number;
  mode: string;
  seasonKey: string;
}

// This switcher renders all the different displays for the audience display
// It triggers the 'visible' prop on the correct display which allows each display to
// animate itself in and out of view
const DisplaySwitcher: FC<IProps> = ({ id, mode, seasonKey }: IProps) => {
  const PreviewDisplay: FC<any> = getPreviewDisplay(mode, seasonKey);
  const PlayDisplay: FC<any> = getPlayDisplay(mode, seasonKey);
  const ResultsDisplay: FC<any> = getResultsDisplay(mode, seasonKey);
  const RankingsDisplay = Rankings;

  return (
    <>
      <PreviewDisplay visible={id === Displays.MATCH_PREVIEW} />
      <PlayDisplay visible={id === Displays.MATCH_START} />
      <ResultsDisplay visible={id === Displays.MATCH_RESULTS} />
      {id === Displays.RANKINGS && <RankingsDisplay />}
    </>
  );
};

function getPreviewDisplay(mode: string, seasonKey: string): FC {
  const Season = getSeason(seasonKey);
  switch (mode) {
    case 'stream3':
      return Season.MatchPlay;
    case 'stream4':
      return Season.MatchResultsOverlay;
    case 'stream5':
      return Season.MatchResults;
    default:
      return Season.MatchPreview;
  }
}

function getPlayDisplay(mode: string, seasonKey: string): FC {
  const Season = getSeason(seasonKey);
  switch (mode) {
    case 'stream':
      return Season.MatchPlay;
    case 'stream3':
      return Season.MatchPlay;
    case 'stream4':
    case 'stream5':
      return Fragment;
    case 'field':
      return Season.MatchPlayTimer;
    default:
      return Season.MatchPlay;
  }
}

function getResultsDisplay(mode: string, seasonKey: string): FC {
  const Season = getSeason(seasonKey);
  switch (mode) {
    case 'stream':
      return Season.MatchResults;
    case 'stream2':
      return Season.MatchResultsOverlay;
    case 'stream3':
      return Season.MatchPlay;
    case 'stream4':
      return Season.MatchResultsOverlay;
    default:
      return Season.MatchResults;
  }
}

const getSeason = (seasonKey: string): AudienceDisplayProvider => {
  switch (seasonKey.toLowerCase()) {
    case 'frc_2023':
      return FRC2023;
    case 'frc_2024':
      return FRC2024;
    case 'fgc_2023':
      return FGC2023;
    default:
      return FRC2023;
  }
};
