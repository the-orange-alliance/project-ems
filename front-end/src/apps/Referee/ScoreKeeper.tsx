import { FC, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import DefaultLayout from 'src/layouts/DefaultLayout';
import { loadedMatchKey } from 'src/stores/Recoil';
import Scoresheet from './components/games/CarbonCapture/Scoresheet';

const ScoreKeeper: FC = () => {
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
      <Scoresheet />
    </DefaultLayout>
  );
};

export default ScoreKeeper;
