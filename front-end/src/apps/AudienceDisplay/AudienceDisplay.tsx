import { clientFetcher } from '@toa-lib/client';
import { isMatch, Match } from '@toa-lib/models';
import { FC, ReactNode, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useRecoilCallback, useRecoilState, useRecoilValue } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import MatchStateListener from 'src/components/MatchStateListener/MatchStateListener';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import ChromaLayout from 'src/layouts/ChromaLayout';
import { displayChromaKey, displayID, matchResult } from 'src/stores/Recoil';
import './AudienceDisplay.less';
import Blank from './displays/fgc_2022/Blank/Blank';
import MatchPlay from './displays/fgc_2022/MatchPlay/MatchPlay';
import MatchPlayMini from './displays/fgc_2022/MatchPlayMini/MatchPlayMini';
import MatchPreview from './displays/fgc_2022/MatchPreview/MatchPreview';
import MatchResults from './displays/fgc_2022/MatchResults/MatchResults';
import MatchTimer from './displays/fgc_2022/MatchTimer/MatchTimer';

const AudienceDisplay: FC = () => {
  const [display, setDisplay] = useRecoilState(displayID);
  const chromaKey = useRecoilValue(displayChromaKey);
  const [socket, connected] = useSocket();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');

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
  }, []);

  const onDisplay = (id: number) => {
    setDisplay(id);
  };

  const onCommit = useRecoilCallback(({ set }) => async (matchKey: string) => {
    const match: Match = await clientFetcher(
      `match/all/${matchKey}`,
      'GET',
      undefined,
      isMatch
    );
    set(matchResult, match);
  });

  return (
    <ChromaLayout>
      <MatchStateListener />
      <PrestartListener />
      <div id='aud-base' style={{ backgroundColor: chromaKey }}>
        {getDisplay(display, mode || '')}
      </div>
    </ChromaLayout>
  );
};

export default AudienceDisplay;

function getDisplay(id: number, mode: string): ReactNode {
  switch (id) {
    case -1:
      return <div />;
    case 0:
      return <Blank />;
    case 1:
      return <MatchPreview />;
    case 2:
      return getPlayScreen(mode);
    case 3:
      return <MatchResults />;
    default:
      return <Blank />;
  }
}

function getPlayScreen(mode: string): ReactNode {
  switch (mode) {
    case 'field':
      return <MatchTimer />;
    case 'stream':
      return <MatchPlayMini />;
    default:
      return <MatchPlay />;
  }
}
