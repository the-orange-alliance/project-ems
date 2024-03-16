import { FC } from 'react';
import MatchStateListener from 'src/components/sync-effects/MatchStateListener/MatchStateListener';
import MatchUpdateListener from 'src/components/sync-effects/MatchUpdateListener/MatchUpdateListener';
import PrestartListener from 'src/components/sync-effects/PrestartListener/PrestartListener';
import RefereeLayout from 'src/layouts/RefereeLayout';
import { useComponents } from '@seasons/index';
import { useRecoilValue } from 'recoil';
import { currentEventSelector } from '@stores/NewRecoil';

const BlueReferee: FC = () => {
  const event = useRecoilValue(currentEventSelector);
  if (!event) {
    return 'No event selected';
  }
  const seasonComponents = useComponents(event.seasonKey);
  if (!seasonComponents) {
    return 'Unknown season';
  }

  return (
    <RefereeLayout containerWidth='xl'>
      <PrestartListener />
      <MatchStateListener />
      <MatchUpdateListener />
      <seasonComponents.RefereeScoreSheet alliance='blue' />
    </RefereeLayout>
  );
};

export default BlueReferee;
