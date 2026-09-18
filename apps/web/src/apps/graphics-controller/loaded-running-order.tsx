import { Empty, Space, Tag, Typography } from 'antd';
import { FC } from 'react';
import type { LoadedRunningOrder } from './live-timeline-sync.js';

export interface LoadedRunningOrderListProps {
  running: LoadedRunningOrder | null;
  /** Whether the item under the playhead is actually animated in right now. */
  onAir: boolean;
}

/**
 * The transport's running order, read ONLY from the authoritative loaded
 * snapshot (`live-timeline-sync.ts`).
 *
 * This is the list the operator is entitled to trust: every row here is a deep
 * copy the server took at load time, in the order Prev/Go step through, with
 * the playhead where the server says it is. Nothing on this surface can be
 * edited, and nothing it renders can come from a dirty editor buffer - which
 * is the whole point of it existing next to the draft item list (F21). When
 * the draft disagrees with this, THIS is what will air.
 */
export const LoadedRunningOrderList: FC<LoadedRunningOrderListProps> = ({
  running,
  onAir
}) => {
  if (!running || running.rows.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description='Nothing is loaded on the transport.'
        style={{ margin: '12px 0' }}
      />
    );
  }

  return (
    <div
      role='list'
      aria-label='Loaded running order'
      style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
    >
      {running.rows.map((row) => {
        const isNext = row.position === running.index + 1;
        return (
          <div
            key={`${row.position}-${row.id}`}
            role='listitem'
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 8px',
              borderRadius: 4,
              border: row.isPlayhead
                ? `1px solid ${
                    onAir
                      ? 'var(--ant-color-error)'
                      : 'var(--ant-color-success)'
                  }`
                : '1px solid transparent'
            }}
          >
            <Typography.Text type='secondary' style={{ minWidth: 20 }}>
              {row.position + 1}
            </Typography.Text>
            <Typography.Text
              strong={row.isPlayhead}
              ellipsis
              style={{ flex: 1, minWidth: 0 }}
            >
              {row.title}
            </Typography.Text>
            <Space size={4}>
              {row.isPlayhead && (
                <Tag color={onAir ? 'red' : 'green'}>
                  {onAir ? 'ON AIR' : 'LOADED'}
                </Tag>
              )}
              {isNext && <Tag>NEXT</Tag>}
            </Space>
          </div>
        );
      })}
    </div>
  );
};

export default LoadedRunningOrderList;
