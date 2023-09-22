import { FC } from 'react';
import MatchStateListener from 'src/components/MatchStateListener/MatchStateListener';
import MatchUpdateListener from 'src/components/MatchUpdateListener/MatchUpdateListener';
import PrestartListener from 'src/components/PrestartListener/PrestartListener';
import DefaultLayout from 'src/layouts/DefaultLayout';
import { useRecoilValue } from 'recoil';
import { currentEventSelector } from '@stores/NewRecoil';
import { useComponents } from '@seasons/index';

const RedReferee: FC = () => {
  const event = useRecoilValue(currentEventSelector);
  if (!event) {
    return 'No event selected';
  }
  const seasonComponents = useComponents(event.seasonKey);
  if (!seasonComponents) {
    return 'Unknown season';
  }

  return (
    <DefaultLayout containerWidth='xl'>
      <PrestartListener />
      <MatchStateListener />
      <MatchUpdateListener />
      <seasonComponents.RefereeScoreSheet alliance='red' />
    </DefaultLayout>
  );
};

export default RedReferee;
