import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import DefaultLayout from 'src/layouts/DefaultLayout';
import { matchInProgress } from 'src/stores/Recoil';
import RefereeSheet from './components/games/CarbonCapture/RefereeSheet';

const BlueReferee: FC = () => {
  const match = useRecoilValue(matchInProgress);
  const blueAlliance = match?.participants?.filter((p) => p.station >= 20);

  return (
    <DefaultLayout containerWidth='xl'>
      <PrestartListener />
      <RefereeSheet alliance={blueAlliance} />
    </DefaultLayout>
  );
};

export default BlueReferee;
