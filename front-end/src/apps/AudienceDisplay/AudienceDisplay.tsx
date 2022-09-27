import { MatchState } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import ChromaLayout from 'src/layouts/ChromaLayout';
import { loadedMatchKey, matchStateAtom, timer } from 'src/stores/Recoil';
import './AudienceDisplay.less';
import MatchPlay from './displays/fgc_2022/MatchPlay/MatchPlay';
import MatchPreview from './displays/fgc_2022/MatchPreview/MatchPreview';
import MatchResults from './displays/fgc_2022/MatchResults/MatchResults';

const AudienceDisplay: FC = () => {
  const setState = useSetRecoilState(matchStateAtom);
  const setMatchKey = useSetRecoilState(loadedMatchKey);
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on('match:prestart', onPrestart);
      socket?.on('match:abort', onAbort);
      socket?.on('match:start', onStart);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener('match:prestart', onPrestart);
      socket?.removeListener('match:abort', onAbort);
      socket?.removeListener('match:start', onStart);
    };
  }, []);

  const onPrestart = (matchKey: string) => {
    setMatchKey(matchKey);
  };

  const onStart = () => {
    setState(MatchState.MATCH_IN_PROGRESS);
    timer.start();
  };

  const onAbort = () => {
    setState(MatchState.MATCH_ABORTED);
    timer.abort();
  };

  return (
    <ChromaLayout>
      <div id='aud-base'>
        <MatchResults />
      </div>
    </ChromaLayout>
  );
};

export default AudienceDisplay;
