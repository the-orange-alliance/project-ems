import { clientFetcher } from '@toa-lib/client';
import {
  isMatch,
  Match,
  MatchDetailBase,
  MatchKey,
  HydrogenHorizons
} from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useRecoilCallback } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import { currentMatchIdAtom, matchInProgressAtom } from 'src/stores/NewRecoil';

const PrestartListener: FC = () => {
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on('match:prestart', onPrestart);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener('match:prestart', onPrestart);
    };
  }, []);

  const onPrestart = useRecoilCallback(({ set }) => async (key: MatchKey) => {
    const match: Match<MatchDetailBase> = await clientFetcher(
      `match/all/${key.eventKey}/${key.tournamentKey}/${key.id}`,
      'GET',
      undefined,
      isMatch
    );
    const newMatch = { ...match };
    // TODO - Create a resetMatch() method that would help here.
    newMatch.details = { ...HydrogenHorizons.defaultMatchDetails };
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
  });

  return null;
};

export default PrestartListener;
