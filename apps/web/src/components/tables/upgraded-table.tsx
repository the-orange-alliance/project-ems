import { JSX, useEffect, useMemo, useRef } from 'react';
import { Table, Button, Space, TableRef } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';

type Cell = string | number | JSX.Element;

/** Applies to every column (`true`) or only the columns with these headers. */
type ColumnSelection = boolean | string[];

interface Props<T> {
  data: T[];
  headers: string[];
  rowKey: keyof T;
  widths?: number[];
  virtual?: boolean;
  disable?: boolean;
  loading?: boolean;
  /** Fixed body height (`y`) keeps the header in view and scrolls rows inside the table. */
  scroll?: { x?: number | string; y?: number | string };
  /** Columns that can be sorted. Only string and number cells are compared. */
  sortable?: ColumnSelection;
  /** Overrides the default cell comparison for the column with the header. */
  columnSorters?: Record<string, (a: T, b: T) => number>;
  /** Columns that can be filtered by the distinct string and number cells. */
  filterable?: ColumnSelection;
  selected?: (row: T) => boolean;
  renderRow: (row: T) => Cell[];
  onSelect?: (row: T) => void;
  onModify?: (row: T) => void;
  onDelete?: (row: T) => void;
}

const isSelected = (selection: ColumnSelection | undefined, header: string) =>
  Array.isArray(selection) ? selection.includes(header) : !!selection;

const isComparable = (cell: Cell): cell is string | number =>
  typeof cell !== 'object';

const compareText = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true });

const compareCells = (a: Cell, b: Cell) =>
  typeof a === 'number' && typeof b === 'number'
    ? a - b
    : compareText(String(a), String(b));

export const UpgradedTable = <T,>({
  data,
  headers,
  rowKey,
  widths,
  virtual,
  disable,
  loading,
  scroll,
  sortable,
  columnSorters,
  filterable,
  selected,
  renderRow,
  onSelect,
  onModify,
  onDelete
}: Props<T>) => {
  const showActions = onModify || onDelete;
  const tableRef = useRef<TableRef>(null);

  // Each column renders from the same row, so build a row's cells only once.
  const cellsOf = useMemo(() => {
    const cache = new Map<T, Cell[]>();
    return (row: T) => {
      let cells = cache.get(row);
      if (!cells) {
        cells = renderRow(row);
        cache.set(row, cells);
      }
      return cells;
    };
  }, [data, renderRow]);

  const selectedRow = selected ? data.find(selected) : undefined;
  const selectedKey = selectedRow ? `row-${selectedRow[rowKey]}` : undefined;

  // A virtualized table only mounts nearby rows, so bring the selection into view.
  useEffect(() => {
    if (virtual && selectedKey)
      tableRef.current?.scrollTo({ key: selectedKey });
  }, [virtual, selectedKey]);

  const filterOptions = (index: number) =>
    [...new Set(data.map((row) => cellsOf(row)[index]).filter(isComparable))]
      .map(String)
      .sort(compareText)
      .map((value) => ({ text: value, value }));

  const columns = [
    ...headers.flatMap((header, index) => [
      {
        title: header,
        dataIndex: index,
        key: `header-${index}`,
        width: widths ? widths[index] : undefined,
        render: (_: any, record: T) => cellsOf(record)[index],
        ...(isSelected(sortable, header)
          ? {
              sorter:
                columnSorters?.[header] ??
                ((a: T, b: T) =>
                  compareCells(cellsOf(a)[index], cellsOf(b)[index]))
            }
          : {}),
        ...(isSelected(filterable, header)
          ? {
              filters: filterOptions(index),
              filterSearch: true,
              onFilter: (value: unknown, record: T) =>
                String(cellsOf(record)[index]) === value
            }
          : {})
      }
    ]),
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
      ref={tableRef}
      rowKey={(record) => `row-${record[rowKey]}`}
      columns={columns as any}
      dataSource={data}
      loading={loading}
      rowClassName={(record) =>
        selected?.(record) ? 'ant-table-row-selected' : ''
      }
      onRow={(record) => ({
        onClick: () => onSelect?.(record),
        className: onSelect ? 'mouse-click' : disable ? 'mouse-disable' : ''
      })}
      rowHoverable={!disable}
      pagination={false}
      bordered
      virtual={virtual}
      scroll={{
        y: virtual ? window.innerHeight - 280 : undefined,
        x: virtual ? (widths?.reduce((a, b) => a + b, 0) ?? 800) : undefined,
        ...scroll
      }}
    />
  );
};
