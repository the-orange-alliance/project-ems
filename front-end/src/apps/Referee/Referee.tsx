import { clientFetcher } from '@toa-lib/client';
import { isMatch, defaultCarbonCaptureDetails } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useRecoilCallback } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import DefaultLayout from 'src/layouts/DefaultLayout';
import { loadedMatchKey, matchInProgress, displayID } from 'src/stores/Recoil';
import AllianceCards from './components/AllianceCards';

const RefereeApp: FC = () => {
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on('match:prestart', onPrestart);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.off('match:prestart', onPrestart);
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
        // TODO - Create a resetMatch() method that would help here.
        match.details = defaultCarbonCaptureDetails;
        match.redScore = 0;
        match.blueScore = 0;
        set(loadedMatchKey, matchKey);
        set(matchInProgress, match);
        set(displayID, 1);
      }
  );

  return (
    <DefaultLayout containerWidth='xl'>
      <AllianceCards />
    </DefaultLayout>
  );
};

export default RefereeApp;
