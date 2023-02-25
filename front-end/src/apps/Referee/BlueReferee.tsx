import { FC } from 'react';
import MatchStateListener from 'src/components/MatchStateListener/MatchStateListener';
import MatchUpdateListener from 'src/components/MatchUpdateListener/MatchUpdateListener';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import DefaultLayout from 'src/layouts/DefaultLayout';
import BlueScoreSheet from './components/games/ChargedUp/BlueScoreSheet';

const BlueReferee: FC = () => {
  return (
    <DefaultLayout containerWidth='xl'>
      <PrestartListener />
      <MatchStateListener />
      <MatchUpdateListener />
      <BlueScoreSheet />
    </DefaultLayout>
  );
};

export default BlueReferee;
