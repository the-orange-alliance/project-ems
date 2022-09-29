import { clientFetcher } from '@toa-lib/client';
import { isMatch, MatchState } from '@toa-lib/models';
import { FC, ReactNode, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRecoilCallback, useRecoilState, useSetRecoilState } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import ChromaLayout from 'src/layouts/ChromaLayout';
import {
  displayID,
  loadedMatchKey,
  matchByMatchKey,
  matchStateAtom,
  timer
} from 'src/stores/Recoil';
import './AudienceDisplay.less';
import Blank from './displays/fgc_2022/Blank/Blank';
import MatchPlay from './displays/fgc_2022/MatchPlay/MatchPlay';
import MatchPlayMini from './displays/fgc_2022/MatchPlayMini/MatchPlayMini';
import MatchPreview from './displays/fgc_2022/MatchPreview/MatchPreview';
import MatchResults from './displays/fgc_2022/MatchResults/MatchResults';
import MatchTimer from './displays/fgc_2022/MatchTimer/MatchTimer';

const AudienceDisplay: FC = () => {
  const setState = useSetRecoilState(matchStateAtom);
  const [display, setDisplay] = useRecoilState(displayID);
  const [socket, connected] = useSocket();
  const { mode } = useParams();

  useEffect(() => {
    if (connected) {
      socket?.on('match:abort', onAbort);
      socket?.on('match:start', onStart);
      socket?.on('match:end', onEnd);
      socket?.on('match:display', onDisplay);
      socket?.on('match:commit', onCommit);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener('match:abort', onAbort);
      socket?.removeListener('match:start', onStart);
      socket?.removeListener('match:end', onEnd);
      socket?.removeListener('match:display', onDisplay);
      socket?.removeListener('match:commit', onCommit);
    };
  }, []);

  const onStart = () => {
    setState(MatchState.MATCH_IN_PROGRESS);
    timer.start();
  };

  const onAbort = () => {
    setState(MatchState.MATCH_ABORTED);
    timer.abort();
  };

  const onEnd = () => {
    timer.stop();
  };

  const onDisplay = (id: number) => {
    setDisplay(id);
  };

  const onCommit = useRecoilCallback(({ set }) => async (matchKey: string) => {
    set(loadedMatchKey, matchKey);
    const match = await clientFetcher(
      `match/all/${matchKey}`,
      'GET',
      undefined,
      isMatch
    );
    set(matchByMatchKey(matchKey), match);
  });

  return (
    <ChromaLayout>
      <PrestartListener />
      <div id='aud-base'>{getDisplay(display, mode || '')}</div>
    </ChromaLayout>
  );
};

export default AudienceDisplay;

function getDisplay(id: number, mode: string): ReactNode {
  switch (id) {
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
