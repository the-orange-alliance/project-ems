import { DeleteOutlined } from '@ant-design/icons';
import { DayBreak, TimelineEntry } from '@toa-lib/models';
import {
  Button,
  Flex,
  Input,
  InputNumber,
  TimePicker,
  Tooltip,
  Typography
} from 'antd';
import { DateTime } from 'luxon';
import { FC } from 'react';
import { Field } from './field.js';
import { CLOCK_FORMAT, formatClock, toPickerValue, withClock } from './time.js';

type PlacedBreak = Extract<TimelineEntry, { type: 'break' }>;

interface Props {
  dayBreak: DayBreak;
  /** Where the break actually lands in the day; undefined when it isn't used. */
  placed?: PlacedBreak;
  hasError: boolean;
  disabled?: boolean;
  onChange: (changes: Partial<DayBreak>) => void;
  onRemove: () => void;
}

export const BreakRow: FC<Props> = ({
  dayBreak,
  placed,
  hasError,
  disabled,
  onChange,
  onRemove
}) => {
  const requested = DateTime.fromISO(dayBreak.startTime).toMillis();
  const waits = placed !== undefined && placed.start !== requested;

  return (
    <Flex gap={12} wrap align='flex-end'>
      <Field label='Break'>
        <Input
          value={dayBreak.name}
          disabled={disabled}
          style={{ width: 180 }}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </Field>
      <Field label='Starts around'>
        <TimePicker
          allowClear={false}
          needConfirm={false}
          minuteStep={5}
          format={CLOCK_FORMAT}
          value={toPickerValue(dayBreak.startTime)}
          status={hasError ? 'error' : undefined}
          disabled={disabled}
          style={{ width: 120 }}
          onChange={(picked) =>
            picked &&
            onChange({ startTime: withClock(dayBreak.startTime, picked) })
          }
        />
      </Field>
      <Field label='Minutes'>
        <InputNumber
          min={1}
          precision={0}
          value={dayBreak.duration}
          disabled={disabled}
          style={{ width: 90 }}
          onChange={(duration) => duration !== null && onChange({ duration })}
        />
      </Field>
      <Field label='Runs'>
        {placed ? (
          <Tooltip
            title={
              waits
                ? 'Starts at the next gap between matches so no match is cut short.'
                : undefined
            }
          >
            <Typography.Text strong>
              {formatClock(placed.start)} – {formatClock(placed.end)}
              {waits && ' *'}
            </Typography.Text>
          </Tooltip>
        ) : (
          <Typography.Text type='secondary'>Not used</Typography.Text>
        )}
      </Field>
      <Button
        type='text'
        danger
        aria-label='Remove break'
        icon={<DeleteOutlined />}
        disabled={disabled}
        onClick={onRemove}
      />
    </Flex>
  );
};
