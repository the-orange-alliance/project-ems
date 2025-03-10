import { apiFetcher } from '@toa-lib/client';
import { MatchKey, MatchSocketEvent, rankingZod } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useRecoilCallback } from 'recoil';
import { useSocket } from 'src/api/use-socket';
import { matchOccurringRanksAtom } from 'src/stores/recoil';

export const SyncOnCommit: FC = () => {
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.COMMIT, handleCommit);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener(MatchSocketEvent.COMMIT, handleCommit);
    };
  }, []);

  const handleCommit = useRecoilCallback(
    ({ set }) =>
      async ({ eventKey, tournamentKey, id }: MatchKey) => {
        const rankings = await apiFetcher(
          `ranking/${eventKey}/${tournamentKey}/${id}`,
          'GET',
          undefined,
          rankingZod.array().parse
        );
        set(matchOccurringRanksAtom, rankings);
      }
  );

  return null;
};
