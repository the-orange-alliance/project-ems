import { Match, MatchSocketEvent, MatchState } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useRecoilCallback } from 'recoil';
import { useSocket } from 'src/api/use-socket';
import { matchOccurringAtom, matchStateAtom } from 'src/stores/recoil';

interface Props {
  stopAfterMatchEnd?: boolean;
}

export const SyncMatchOccurringToRecoil: FC<Props> = ({
  stopAfterMatchEnd
}) => {
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
          set(matchOccurringAtom, newMatch);
        }
      }
  );

  return null;
};
