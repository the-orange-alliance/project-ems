import { FC } from 'react';
import { RefereeLayout } from 'src/layouts/referee-layout';
import { useComponents } from '@seasons/index';
import { useRecoilValue } from 'recoil';
import { currentEventKeyAtom } from '@stores/recoil';
import { useEvent } from 'src/api/use-event-data';

export const BlueReferee: FC = () => {
  const eventKey = useRecoilValue(currentEventKeyAtom);
  const { data: event } = useEvent(eventKey);
  const seasonComponents = useComponents(event?.seasonKey);
  if (!event) {
    return 'No event selected';
  } else if (!seasonComponents) {
    return 'Unknown season';
  } else {
    return (
      <RefereeLayout containerWidth='xl'>
        <seasonComponents.RefereeScoreSheet alliance='blue' />
      </RefereeLayout>
    );
  }
};
