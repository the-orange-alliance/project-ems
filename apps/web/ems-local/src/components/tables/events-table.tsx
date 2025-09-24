import { FC } from 'react';
import { Event, EventTypes } from '@toa-lib/models';
import { UpgradedTable } from './upgraded-table.js';
import { DateTime } from 'luxon';
import { Skeleton } from 'antd';

interface Props {
  events: Event[];
  onSelect?: (event: Event) => void;
  loading?: boolean;
}

const EventsTable: FC<Props> = ({ events, onSelect, loading }) => {
  return (
    <Skeleton loading={loading} active={loading}>
      <UpgradedTable
        rowKey={'eventKey'}
        data={events}
        headers={['Key', 'Name', 'Type', 'Location', 'Date', 'Website']}
        renderRow={(e) => {
          const eventType = EventTypes.find(
            (t) => t.key === e.eventTypeKey
          )?.name;
          const location = [e.city, e.stateProv, e.country]
            .filter((str) => str.length > 0)
            .toString();
          const startDate = DateTime.fromISO(e.startDate);
          const endDate = DateTime.fromISO(e.endDate);
          return [
            e.eventKey,
            e.eventName,
            eventType ?? '',
            `${e.venue} - ${location}`,
            `${startDate.toFormat('EEE, MMM d, y')} - ${endDate.toFormat(
              'EEE, MMM d, y'
            )}`,
            e.website
          ];
        }}
        onSelect={onSelect}
      />
    </Skeleton>
  );
};

export default EventsTable;
