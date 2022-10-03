import { FC } from 'react';
import { useRecoilValue } from 'recoil';
import MatchStateListener from 'src/components/MatchStateListener/MatchStateListener';
import MatchUpdateListener from 'src/components/MatchUpdateListener/MatchUpdateListener';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import DefaultLayout from 'src/layouts/DefaultLayout';
import { matchInProgress } from 'src/stores/Recoil';
import RefereeSheet from './components/games/CarbonCapture/RefereeSheet';

const RedReferee: FC = () => {
  const match = useRecoilValue(matchInProgress);
  const redAlliance = match?.participants?.filter((p) => p.station < 20);

  return (
    <DefaultLayout containerWidth='xl'>
      <PrestartListener />
      <MatchStateListener />
      <MatchUpdateListener />
      <RefereeSheet alliance={redAlliance || []} />
    </DefaultLayout>
  );
};

export default RedReferee;
