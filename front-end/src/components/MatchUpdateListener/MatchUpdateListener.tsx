import { Match, MatchState } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import { matchInProgressAtom, matchStateAtom } from 'src/stores/NewRecoil';

interface Props {
  stopAfterMatchEnd?: boolean;
}

const MatchUpdateListener: FC<Props> = ({ stopAfterMatchEnd }) => {
  const state = useRecoilValue(matchStateAtom);
  const setMatch = useSetRecoilState(matchInProgressAtom);
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

  const onUpdate = (newMatch: Match<any>) => {
    if (stopAfterMatchEnd && state >= MatchState.MATCH_COMPLETE) {
      // Don't update anything.
      return;
    } else {
      setMatch(newMatch);
    }
  };

  return null;
};

export default MatchUpdateListener;
