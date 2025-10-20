import { apiFetcher } from '@toa-lib/client';
import { MatchKey, MatchSocketEvent, rankingZod } from '@toa-lib/models';
import { useAtomCallback } from 'jotai/utils';
import { FC, useEffect } from 'react';
import { useSocket } from 'src/api/use-socket.js';
import { matchOccurringRanksAtom } from 'src/stores/state/event.js';

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

  const handleCommit = useAtomCallback(
    (get, set) =>
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
