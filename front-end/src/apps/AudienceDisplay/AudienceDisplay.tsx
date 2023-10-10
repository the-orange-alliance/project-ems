import { clientFetcher } from '@toa-lib/client';
import {
  Displays,
  isMatch,
  Match,
  MatchKey,
  MatchSocketEvent
} from '@toa-lib/models';
import { useSearchParams } from 'react-router-dom';
import { FC, ReactNode, Suspense, useEffect, useRef } from 'react';
import { useRecoilCallback, useRecoilState } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import MatchStateListener from 'src/components/MatchStateListener/MatchStateListener';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import ChromaLayout from 'src/layouts/ChromaLayout';
import {
  displayChromaKeyAtom,
  displayIdAtom,
  matchResultAtom
} from 'src/stores/NewRecoil';
import MatchPreview from './displays/fgc_2023/MatchPreview/MatchPreview';
import MatchPlay from './displays/fgc_2023/MatchPlay/MatchPlay';
import MatchResults from './displays/fgc_2023/MatchResults/MatchResults';
import MatchResultsOverlay from './displays/fgc_2023/MatchResults/MatchResultsOverlay';
import Rankings from './displays/fgc_2023/Rankings/Rankings';
import { useHiddenMotionlessCursor } from '@features/hooks/use-hidden-motionless-cursor';
import './AudienceDisplay.less';
import MatchPlayTimer from './displays/fgc_2023/MatchPlayTimer/MatchPlayTimer';
import { updateSocketClient } from 'src/api/ApiProvider';
import RankingsPlayoffs from './displays/fgc_2023/RankingsPlayoffs/RankingsPlayoff';

const AudienceDisplay: FC = () => {
  const [display, setDisplay] = useRecoilState(displayIdAtom);
  const [chromaKey, setChromaKey] = useRecoilState(displayChromaKeyAtom);
  const [socket, connected] = useSocket();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') ?? '';
  const delay = searchParams.get('delay') ?? '15000';
  let paramChroma = searchParams.get('chroma');

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
          {mode === 'pit' ? <RankingsPlayoffs /> : getDisplay(display, mode)}
        </div>
      </ChromaLayout>
    </Suspense>
  );
};

export default AudienceDisplay;

function getDisplay(id: number, mode: string): ReactNode {
  switch (id) {
    case Displays.MATCH_PREVIEW:
      return getPreviewDisplay(mode);
    case Displays.MATCH_START:
      return getPlayDisplay(mode);
    case Displays.MATCH_RESULTS:
      return getResultsDisplay(mode);
    case Displays.RANKINGS:
      return <Rankings />;
    default:
      return <div />;
  }
}

function getPreviewDisplay(mode: string): ReactNode {
  switch (mode) {
    case 'stream3':
      return <MatchPlay />;
    case 'stream4':
      return <MatchResultsOverlay />;
    case 'stream5':
      return <MatchResults />;
    default:
      return <MatchPreview />;
  }
}

function getPlayDisplay(mode: string): ReactNode {
  switch (mode) {
    case 'stream':
      return <MatchPlay />;
    case 'stream3':
      return <MatchPlay />;
    case 'stream4':
    case 'stream5':
      return null;
    case 'field':
      return <MatchPlayTimer />;
    default:
      return <MatchPlay />;
  }
}

function getResultsDisplay(mode: string): ReactNode {
  switch (mode) {
    case 'stream':
      return <MatchResults />;
    case 'stream2':
      return <MatchResultsOverlay />;
    case 'stream3':
      return <MatchPlay />;
    case 'stream4':
      return <MatchResultsOverlay />;
    default:
      return <MatchResults />;
  }
}
