import { FC } from 'react';
import MatchStateListener from 'src/components/MatchStateListener/MatchStateListener';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import DefaultLayout from 'src/layouts/DefaultLayout';
import ScoreSheet from './components/games/CarbonCapture/Scoresheet';

const ScoreKeeper: FC = () => {
  return (
    <DefaultLayout containerWidth='xl'>
      <PrestartListener />
      <MatchStateListener />
      <ScoreSheet />
    </DefaultLayout>
  );
};

export default ScoreKeeper;
