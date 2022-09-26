import { FC, useEffect } from 'react';
import { useRecoilState } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import DefaultLayout from 'src/layouts/DefaultLayout';
import { selectedMatchKeyAtom } from 'src/stores/Recoil';
import Scoresheet from './components/games/CarbonCapture/Scoresheet';

const RefereeApp: FC = () => {
  const [, setMatchKey] = useRecoilState(selectedMatchKeyAtom);
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
    console.log('PRESTARTING');
    setMatchKey(matchKey);
  };

  return (
    <DefaultLayout containerWidth='xl'>
      <Scoresheet />
    </DefaultLayout>
  );
};

export default RefereeApp;
