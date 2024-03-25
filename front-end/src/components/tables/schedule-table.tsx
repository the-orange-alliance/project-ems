import { ScheduleItem } from '@toa-lib/models';
import { FC } from 'react';
import UpgradedTable from './UpgradedTable/UpgradedTable';
import { DateTime } from 'luxon';

interface Props {
  items: ScheduleItem[];
}

export const ScheduleTable: FC<Props> = ({ items }) => {
  return (
    <UpgradedTable
      data={items}
      headers={['Day', 'Name', 'Start Time', 'Duration', 'Is Match']}
      renderRow={(e) => {
        return [
          e.day,
          e.name,
          DateTime.fromISO(e.startTime).toLocaleString(DateTime.DATETIME_MED),
          e.duration,
          e.isMatch ? 'Yes' : 'No'
        ];
      }}
    />
  );
};
