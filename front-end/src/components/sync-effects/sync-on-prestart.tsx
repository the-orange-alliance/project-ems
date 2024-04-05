import { apiFetcher } from '@toa-lib/client';
import {
  Match,
  MatchDetailBase,
  MatchKey,
  MatchSocketEvent,
  getDefaultMatchDetailsBySeasonKey,
  getSeasonKeyFromEventKey,
  matchZod
} from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useRecoilCallback } from 'recoil';
import { useSocket } from 'src/api/use-socket';
import { currentMatchIdAtom, matchOccurringAtom } from 'src/stores/recoil';

export const SyncOnPrestart: FC = () => {
  const [socket, connected] = useSocket();
  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.PRESTART, handlePrestart);
    }
  }, [connected]);
  useEffect(() => {
    return () => {
      socket?.removeListener(MatchSocketEvent.PRESTART, handlePrestart);
    };
  });
  const handlePrestart = useRecoilCallback(
    ({ set }) =>
      async (key: MatchKey) => {
        const { eventKey, id, tournamentKey } = key;
        const match: Match<MatchDetailBase> = await apiFetcher(
          `match/all/${eventKey}/${tournamentKey}/${id}`,
          'GET',
          undefined,
          matchZod.parse
        );
        const seasonKey = getSeasonKeyFromEventKey(eventKey);
        const details = getDefaultMatchDetailsBySeasonKey(seasonKey);
        match.details = { eventKey, id, tournamentKey, ...details };
        match.redMinPen = 0;
        match.blueMinPen = 0;
        match.redScore = 0;
        match.blueScore = 0;
        match.result = -1;
        // Reset participant cards
        if (match.participants) {
          for (const participant of match.participants) {
            participant.cardStatus = 0;
            participant.disqualified = 0;
            participant.noShow = 0;
          }
        }
        set(matchOccurringAtom, match);
        set(currentMatchIdAtom, match.id);
      }
  );
  return null;
};
