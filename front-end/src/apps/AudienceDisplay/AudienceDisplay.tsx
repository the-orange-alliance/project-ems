import { clientFetcher } from '@toa-lib/client';
import { Displays, isMatch, Match, MatchKey } from '@toa-lib/models';
import { useSearchParams } from 'react-router-dom';
import { FC, ReactNode, useEffect } from 'react';
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil';
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
import { useHiddenMotionlessCursor } from '@features/hooks/use-hidden-motionless-cursor';
import './AudienceDisplay.less';
import MatchResultsOverlay from './displays/fgc_2023/MatchResults/MatchResultsOverlay';

const AudienceDisplay: FC = () => {
  const [display, setDisplay] = useRecoilState(displayIdAtom);
  const chromaKey = useRecoilValue(displayChromaKeyAtom);
  const [socket, connected] = useSocket();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') ?? '';
  useHiddenMotionlessCursor();

  useEffect(() => {
    if (connected) {
      socket?.on('match:display', onDisplay);
      socket?.on('match:commit', onCommit);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener('match:display', onDisplay);
      socket?.removeListener('match:commit', onCommit);
    };
  }, [display]);

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
    <ChromaLayout>
      <MatchStateListener />
      <PrestartListener />
      <div id='aud-base' style={{ backgroundColor: chromaKey }}>
        {getDisplay(display, mode)}
      </div>
    </ChromaLayout>
  );
};

export default AudienceDisplay;

function getDisplay(id: number, mode: string): ReactNode {
  switch (id) {
    case -1:
      return <div />;
    case Displays.MATCH_PREVIEW:
      return <MatchPreview />;
    case Displays.MATCH_START:
      return getPlayDisplay(mode);
    case Displays.MATCH_RESULTS:
      return <MatchResults />;
    default:
      return <div />;
  }
}

function getPlayDisplay(mode: string): ReactNode {
  switch (mode) {
    case 'stream':
      return <MatchResultsOverlay />;
    default:
      return <MatchPlay />;
  }
}
