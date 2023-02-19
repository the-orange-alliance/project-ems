import { clientFetcher } from '@toa-lib/client';
import {
  isMatch,
  defaultCarbonCaptureDetails,
  Match,
  MatchDetailBase
} from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useRecoilCallback } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import { matchInProgressAtom } from 'src/stores/NewRecoil';
import { loadedMatchKey } from 'src/stores/Recoil';

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

  const onPrestart = useRecoilCallback(
    ({ set }) =>
      async (matchKey: string) => {
        const match: Match<MatchDetailBase> = await clientFetcher(
          `match/all/${matchKey}`,
          'GET',
          undefined,
          isMatch
        );
        const newMatch = { ...match };
        // TODO - Create a resetMatch() method that would help here.
        newMatch.details = { ...defaultCarbonCaptureDetails };
        newMatch.details.eventKey = match.eventKey;
        newMatch.details.tournamentKey = match.tournamentKey;
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
        set(loadedMatchKey, matchKey);
        set(matchInProgressAtom, newMatch);
      }
  );

  return null;
};

export default PrestartListener;
