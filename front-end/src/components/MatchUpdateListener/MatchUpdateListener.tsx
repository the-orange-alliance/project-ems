import { Match } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import { matchInProgress } from 'src/stores/Recoil';

const MatchUpdateListener: FC = () => {
  const setMatch = useSetRecoilState(matchInProgress);
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on('match:update', onUpdate);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener('match:update', onUpdate);
    };
  }, []);

  const onUpdate = (newMatch: Match) => {
    setMatch(newMatch);
  };

  return null;
};

export default MatchUpdateListener;
