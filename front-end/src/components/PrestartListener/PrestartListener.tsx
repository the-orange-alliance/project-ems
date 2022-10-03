import { clientFetcher } from '@toa-lib/client';
import { isMatch, defaultCarbonCaptureDetails } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useRecoilCallback } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import { loadedMatchKey, matchInProgress, displayID } from 'src/stores/Recoil';

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
        const match = await clientFetcher(
          `match/all/${matchKey}`,
          'GET',
          undefined,
          isMatch
        );
        const newMatch = { ...match };
        // TODO - Create a resetMatch() method that would help here.
        newMatch.details = { ...defaultCarbonCaptureDetails };
        newMatch.details.matchKey = match.matchKey;
        newMatch.details.matchDetailKey = match.matchDetailKey;
        newMatch.redMinPen = 0;
        newMatch.blueMinPen = 0;
        newMatch.redScore = 0;
        newMatch.blueScore = 0;
        set(loadedMatchKey, matchKey);
        set(matchInProgress, newMatch);
        set(displayID, 1);
      }
  );

  return null;
};

export default PrestartListener;
