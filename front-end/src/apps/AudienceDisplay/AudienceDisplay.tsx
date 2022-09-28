import { clientFetcher } from '@toa-lib/client';
import { isMatch, MatchState } from '@toa-lib/models';
import { FC, ReactNode, useEffect } from 'react';
import { useRecoilCallback, useRecoilState, useSetRecoilState } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import ChromaLayout from 'src/layouts/ChromaLayout';
import {
  displayID,
  loadedMatchKey,
  matchInProgress,
  matchStateAtom,
  timer
} from 'src/stores/Recoil';
import './AudienceDisplay.less';
import Blank from './displays/fgc_2022/Blank/Blank';
import MatchPlay from './displays/fgc_2022/MatchPlay/MatchPlay';
import MatchPreview from './displays/fgc_2022/MatchPreview/MatchPreview';
import MatchResults from './displays/fgc_2022/MatchResults/MatchResults';

const AudienceDisplay: FC = () => {
  const setState = useSetRecoilState(matchStateAtom);
  const setMatchKey = useSetRecoilState(loadedMatchKey);
  const [display, setDisplay] = useRecoilState(displayID);
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on('match:prestart', onPrestart);
      socket?.on('match:abort', onAbort);
      socket?.on('match:start', onStart);
      socket?.on('match:display', onDisplay);
      socket?.on('match:commit', onCommit);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener('match:prestart', onPrestart);
      socket?.removeListener('match:abort', onAbort);
      socket?.removeListener('match:start', onStart);
      socket?.removeListener('match:display', onDisplay);
      socket?.removeListener('match:commit', onCommit);
    };
  }, []);

  const onPrestart = (matchKey: string) => {
    setMatchKey(matchKey);
    setDisplay(1);
  };

  const onStart = () => {
    setState(MatchState.MATCH_IN_PROGRESS);
    timer.start();
  };

  const onAbort = () => {
    setState(MatchState.MATCH_ABORTED);
    timer.abort();
  };

  const onDisplay = (id: number) => {
    setDisplay(id);
  };

  const onCommit = useRecoilCallback(
    ({ set, snapshot }) =>
      async (matchKey: string) => {
        const storedKey = await snapshot.getPromise(loadedMatchKey);
        if (matchKey === storedKey) {
          // Re-fetch the data
          const newMatch = await clientFetcher(
            `match/all/${matchKey}`,
            'GET',
            undefined,
            isMatch
          );
          set(matchInProgress, newMatch);
        } else {
          set(loadedMatchKey, matchKey);
        }
      }
  );

  return (
    <ChromaLayout>
      <div id='aud-base'>{getDisplay(display)}</div>
    </ChromaLayout>
  );
};

export default AudienceDisplay;

function getDisplay(id: number): ReactNode {
  switch (id) {
    case 1:
      return <MatchPreview />;
    case 2:
      return <MatchPlay />;
    case 3:
      return <MatchResults />;
    default:
      return <Blank />;
  }
}
