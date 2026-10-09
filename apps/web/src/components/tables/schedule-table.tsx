import { ScheduleItem } from '@toa-lib/models';
import { Table, TableColumnsType, Tag } from 'antd';
import { DateTime } from 'luxon';
import { memo } from 'react';

const PAGE_SIZE = 25;

const columns: TableColumnsType<ScheduleItem> = [
  { title: 'Day', key: 'day', width: 70, render: (_, item) => item.day + 1 },
  {
    title: 'Name',
    key: 'name',
    render: (_, item) =>
      item.isMatch ? item.name : <Tag color='gold'>{item.name}</Tag>
  },
  {
    title: 'Start',
    key: 'start',
    render: (_, item) =>
      DateTime.fromISO(item.startTime).toFormat('ccc, LLL d · h:mm a')
  },
  { title: 'Minutes', key: 'duration', width: 100, dataIndex: 'duration' }
];

interface Props {
  items: ScheduleItem[];
}

// Paged, so only a page of rows is ever rendered however long the schedule is.
export const ScheduleTable = memo(function ScheduleTable({ items }: Props) {
  return (
    <Table<ScheduleItem>
      size='small'
      rowKey='id'
      dataSource={items}
      columns={columns}
      pagination={{
        pageSize: PAGE_SIZE,
        showSizeChanger: false,
        hideOnSinglePage: true
      }}
    />
  );
});
