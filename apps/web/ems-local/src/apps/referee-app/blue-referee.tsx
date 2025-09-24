import { FC } from 'react';
import { RefereeLayout } from 'src/layouts/referee-layout.js';
import { useComponents } from '@seasons/index.js';
import { useAtomValue } from 'jotai';
import { getSeasonKeyFromEventKey } from '@toa-lib/models';
import { eventKeyAtom } from 'src/stores/state/event.js';
import { useEventState } from 'src/stores/hooks/use-event-state.js';

export const BlueReferee: FC = () => {
  const eventKey = useAtomValue(eventKeyAtom);
  if (!eventKey) {
    return 'No event selected';
  }

  const seasonKey = getSeasonKeyFromEventKey(eventKey);
  const seasonComponents = useComponents(seasonKey);

  if (!seasonComponents) {
    return 'Unknown season';
  } else {
    return (
      <RefereeLayout containerWidth='xl'>
        <seasonComponents.RefereeScoreSheet alliance='blue' />
      </RefereeLayout>
    );
  }
};
