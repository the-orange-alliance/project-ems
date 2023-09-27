import { clientFetcher } from '@toa-lib/client';
import {
  isMatch,
  Match,
  MatchDetailBase,
  MatchKey,
  MatchSocketEvent,
  getSeasonKeyFromEventKey,
  getDefaultMatchDetailsBySeasonKey
} from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useRecoilCallback } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import { currentMatchIdAtom, matchInProgressAtom } from 'src/stores/NewRecoil';

const PrestartListener: FC = () => {
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.PRESTART, onPrestart);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener(MatchSocketEvent.PRESTART, onPrestart);
    };
  }, []);

  const onPrestart = useRecoilCallback(({ set }) => async (key: MatchKey) => {
    const match: Match<MatchDetailBase> = await clientFetcher(
      `match/all/${key.eventKey}/${key.tournamentKey}/${key.id}`,
      'GET',
      undefined,
      isMatch
    );
    const seasonKey = getSeasonKeyFromEventKey(key.eventKey);

    const newMatch = { ...match };
    // TODO - Create a resetMatch() method that would help here.
    newMatch.details = {
      ...getDefaultMatchDetailsBySeasonKey(seasonKey),
      eventKey: match.eventKey,
      tournamentKey: match.tournamentKey,
      id: match.id
    };
    newMatch.details.eventKey = match.eventKey;
    newMatch.details.tournamentKey = match.tournamentKey;
    newMatch.details.id = match.id;
    newMatch.id = match.id;
    newMatch.redMinPen = 0;
    newMatch.blueMinPen = 0;
    newMatch.redScore = 0;
    newMatch.blueScore = 0;
    // Reset participant cards
    if (newMatch.participants) {
      for (const participant of newMatch.participants) {
        participant.cardStatus = 0;
        participant.disqualified = 0;
        participant.noShow = 0;
      }
    }
    set(currentMatchIdAtom, key.id);
    set(matchInProgressAtom, newMatch);

    // It's inefficient to have every client inform the socket.io server of the
    // new match object when it announces the prestart, but prestart is not a
    // performance-sensitive moment.
    socket?.emit(MatchSocketEvent.UPDATE, newMatch);
  });

  return null;
};

export default PrestartListener;
