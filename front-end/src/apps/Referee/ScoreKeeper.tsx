import { FC } from 'react';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import DefaultLayout from 'src/layouts/DefaultLayout';
import ScoreSheet from './components/games/CarbonCapture/Scoresheet';

const ScoreKeeper: FC = () => {
  return (
    <DefaultLayout containerWidth='xl'>
      <PrestartListener />
      <ScoreSheet />
    </DefaultLayout>
  );
};

export default ScoreKeeper;
