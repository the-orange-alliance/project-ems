import { FC } from 'react';
import MatchStateListener from 'src/components/MatchStateListener/MatchStateListener';
import MatchUpdateListener from 'src/components/MatchUpdateListener/MatchUpdateListener';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import DefaultLayout from 'src/layouts/DefaultLayout';
import RedScoreSheet from './components/games/HyodrogenHorizons/RedScoreSheet';

const RedReferee: FC = () => {
  return (
    <DefaultLayout containerWidth='xl'>
      <PrestartListener />
      <MatchStateListener />
      <MatchUpdateListener />
      <RedScoreSheet />
    </DefaultLayout>
  );
};

export default RedReferee;
