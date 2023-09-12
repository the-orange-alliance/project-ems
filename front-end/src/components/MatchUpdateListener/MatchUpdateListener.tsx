import { Match, MatchSocketEvent, MatchState } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useRecoilCallback } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import { matchInProgressAtom, matchStateAtom } from 'src/stores/NewRecoil';

interface Props {
  stopAfterMatchEnd?: boolean;
}

const MatchUpdateListener: FC<Props> = ({ stopAfterMatchEnd }) => {
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.UPDATE, onUpdate);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener(MatchSocketEvent.UPDATE, onUpdate);
    };
  }, []);

  const onUpdate = useRecoilCallback(
    ({ snapshot, set }) =>
      async (newMatch: Match<any>) => {
        const state = await snapshot.getPromise(matchStateAtom);
        if (stopAfterMatchEnd && state >= MatchState.MATCH_COMPLETE) {
          // Don't update anything.
          return;
        } else {
          set(matchInProgressAtom, newMatch);
        }
      }
  );

  return null;
};

export default MatchUpdateListener;
