import { JSX } from 'react';
import { Table, Button, Space } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

interface Props<T> {
  data: T[];
  headers: string[];
  rowKey: keyof T;
  selected?: (row: T) => boolean;
  renderRow: (row: T) => (string | number | JSX.Element)[];
  onSelect?: (row: T) => void;
  onModify?: (row: T) => void;
  onDelete?: (row: T) => void;
}

export const UpgradedTable = <T,>({
  data,
  headers,
  rowKey,
  selected,
  renderRow,
  onSelect,
  onModify,
  onDelete
}: Props<T>) => {
  const showActions = onModify || onDelete;

  const columns = [
    ...headers.map((header, index) => ({
      title: header,
      dataIndex: index,
      key: `header-${index}`,
      render: (_: any, record: T) => renderRow(record)[index]
    })),
    showActions && {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_: any, record: T) => (
        <Space>
          {onModify && (
            <Button
              type='link'
              icon={<EditOutlined />}
              onClick={() => onModify(record)}
            />
          )}
          {onDelete && (
            <Button
              type='link'
              icon={<DeleteOutlined />}
              onClick={() => onDelete(record)}
              danger
            />
          )}
        </Space>
      )
    }
  ].filter(Boolean);

  return (
    <Table
      rowKey={(record) => `row-${record[rowKey]}`}
      columns={columns as any}
      dataSource={data}
      rowClassName={(record) =>
        onSelect && selected?.(record) ? 'ant-table-row-selected' : ''
      }
      onRow={(record) => ({
        onClick: () => onSelect?.(record),
        className: onSelect ? 'mouse-click' : ''
      })}
      pagination={false}
      bordered
    />
  );
};
