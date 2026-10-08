import { ClockCircleOutlined } from '@ant-design/icons';
import { Flex, Tag, Tooltip } from 'antd';
import { DateTime } from 'luxon';
import { FC } from 'react';
import { useScheduleStatus } from 'src/hooks/use-schedule-status.js';
import { CycleTimeStats } from 'src/util/schedule-status.js';

/** Behind by more than this many minutes reads as a problem, not a slip. */
const LATE_MINUTES = 5;

/** Whole minutes as "7m" or "1h 15m". */
const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};

/** A cycle time as "m:ss". */
const formatCycle = (minutes: number): string => {
  const seconds = Math.round(minutes * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

const CycleRow: FC<{ label: string; value: number | null; note?: string }> = ({
  label,
  value,
  note
}) =>
  value === null ? null : (
    <Flex justify='space-between' gap={16}>
      <span>{label}</span>
      <span>
        <strong>{formatCycle(value)}</strong>
        {note && ` ${note}`}
      </span>
    </Flex>
  );

const CycleDetails: FC<{ cycleTimes: CycleTimeStats }> = ({ cycleTimes }) => (
  <Flex vertical gap={2} style={{ minWidth: 220 }}>
    <strong>Cycle time</strong>
    <CycleRow label='Scheduled' value={cycleTimes.scheduled} />
    <CycleRow
      label='Average'
      value={cycleTimes.average}
      note={`(${cycleTimes.count})`}
    />
    <CycleRow label='Recent average' value={cycleTimes.recentAverage} />
    <CycleRow label='Last' value={cycleTimes.last} />
    <CycleRow label='Current' value={cycleTimes.current} note='so far' />
    <CycleRow
      label='Prestart to start'
      value={cycleTimes.averagePrestartToStart}
      note='avg'
    />
    {cycleTimes.count === 0 && <span>No cycles measured yet.</span>}
  </Flex>
);

/** Shows how far ahead or behind schedule the next match is, with cycle times on hover. */
export const ScheduleStatusChip: FC<{ small?: boolean }> = ({ small }) => {
  const status = useScheduleStatus();
  if (!status?.nextMatch || status.offsetMinutes === null) return null;

  const { nextMatch, offsetMinutes, cycleTimes } = status;
  const minutes = Math.round(Math.abs(offsetMinutes));
  const onTime = minutes === 0;
  const ahead = offsetMinutes > 0;
  const color =
    onTime || ahead ? 'success' : minutes > LATE_MINUTES ? 'error' : 'warning';
  const label = onTime
    ? 'On time'
    : `${formatMinutes(minutes)} ${ahead ? 'ahead' : 'behind'}`;

  return (
    <Tooltip
      title={
        <Flex vertical gap={8}>
          <span>
            Next: <strong>{nextMatch.name}</strong> at{' '}
            {DateTime.fromISO(nextMatch.scheduledTime).toFormat('h:mm a')}
          </span>
          <CycleDetails cycleTimes={cycleTimes} />
        </Flex>
      }
    >
      <Tag
        icon={<ClockCircleOutlined />}
        color={color}
        style={{
          marginInlineEnd: 0,
          ...(!small && { fontSize: 'large', padding: '8px' })
        }}
      >
        {label}
      </Tag>
    </Tooltip>
  );
};
