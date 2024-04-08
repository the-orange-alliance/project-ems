import { FC } from 'react';
import RefereeLayout from 'src/layouts/RefereeLayout';
import { useComponents } from '@seasons/index';
import { useRecoilValue } from 'recoil';
import { currentEventKeyAtom } from '@stores/NewRecoil';
import { SyncMatchOccurringToRecoil } from 'src/components/sync-effects/sync-match-occurring-to-recoil';
import { SyncMatchStateToRecoil } from 'src/components/sync-effects/sync-match-state-to-recoil';
import { SyncMatchesToRecoil } from 'src/components/sync-effects/sync-matches-to-recoi';
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
        <SyncMatchStateToRecoil />
        <SyncMatchesToRecoil />
        <SyncMatchOccurringToRecoil />
        <seasonComponents.RefereeScoreSheet alliance='blue' />
      </RefereeLayout>
    );
  }
};
