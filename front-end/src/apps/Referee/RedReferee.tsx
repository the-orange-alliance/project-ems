import { FC, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import DefaultLayout from 'src/layouts/DefaultLayout';
import { loadedMatchKey, matchInProgress } from 'src/stores/Recoil';
import RefereeSheet from './components/games/CarbonCapture/RefereeSheet';

const RedReferee: FC = () => {
  const match = useRecoilValue(matchInProgress);
  const redAlliance = match?.participants?.filter((p) => p.station < 20);
  const [, setMatchKey] = useRecoilState(loadedMatchKey);
  const [socket, connected] = useSocket();

  useEffect(() => {
    socket?.on('match:prestart', onPrestart);
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.removeListener('match:prestart', onPrestart);
    };
  }, []);

  const onPrestart = (matchKey: string) => {
    setMatchKey(matchKey);
  };

  return (
    <DefaultLayout containerWidth='xl'>
      <RefereeSheet alliance={redAlliance} />
    </DefaultLayout>
  );
};

export default RedReferee;
