import { Match, MatchState } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import ChromaLayout from 'src/layouts/ChromaLayout';
import { matchStateAtom, selectedMatchKeyAtom, timer } from 'src/stores/Recoil';
import './AudienceDisplay.less';
import MatchPlay from './displays/fgc_2022/MatchPlay/MatchPlay';

const AudienceDisplay: FC = () => {
  const setState = useSetRecoilState(matchStateAtom);
  const setMatchKey = useSetRecoilState(selectedMatchKeyAtom);
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on('match:prestart', onPrestart);
      socket?.on('match:start', onStart);
      socket?.on('match:update', onUpdate);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener('match:prestart', onPrestart);
      socket?.removeListener('match:start', onStart);
      socket?.removeListener('match:update', onUpdate);
    };
  }, []);

  const onPrestart = (matchKey: string) => {
    setMatchKey(matchKey);
  };

  const onStart = () => {
    setState(MatchState.MATCH_IN_PROGRESS);
    timer.start();
  };

  const onUpdate = (match: Match) => {};

  return (
    <ChromaLayout>
      <div id='aud-base'>
        <MatchPlay />
      </div>
    </ChromaLayout>
  );
};

export default AudienceDisplay;
