import { FC } from 'react';
import { Card, Space, Typography } from 'antd';
import { NumberInput } from './number-input.js';

interface Props {
  /** Label shown above the LED (1:1) input, e.g. "Red SUPPRESSION UNIT". */
  title: string;
  /** Current LED count (1:1 with the on-field LEDs). */
  ledCount: number;
  /** Current exact ball count. */
  ballCount: number;
  /** Balls represented per lit LED. Must be >= 1. */
  ratio: number;
  /** Fired with the new LED count when the ref edits the LED side. */
  onLedChange: (newLedCount: number) => void;
  /** Fired with the new ball count when the ref edits the ball side. */
  onBallChange: (newBallCount: number) => void;
  /** Disables both inputs, e.g. once results are committed. */
  disabled?: boolean;
  /**
   * Disables just the LED input, e.g. once the match is over and the on-field LEDs are no
   * longer live - the ball count stays editable for post-match corrections.
   */
  ledDisabled?: boolean;
}

/**
 * A two-sided "conversion calculator" for LED-tracked scoring elements: a ref can type or
 * step either the 1:1 LED count or the exact ball count, and the other value is derived from
 * whichever one was just touched (see ledCountToBallCount/ballCountToLedCount in the season
 * model). Both values are always whole numbers.
 */
export const LedBallCalculator: FC<Props> = ({
  title,
  ledCount,
  ballCount,
  ratio,
  onLedChange,
  onBallChange,
  disabled,
  ledDisabled
}) => {
  return (
    <Card size='small' style={{ width: '100%' }}>
      <Space direction='vertical' align='center' style={{ width: '100%' }}>
        <Typography.Title
          level={5}
          style={{ textAlign: 'center', textTransform: 'capitalize', margin: 0 }}
        >
          {title}
        </Typography.Title>
        <Typography.Text type='secondary'>
          1 LED = {ratio} ball{ratio === 1 ? '' : 's'}
        </Typography.Text>
        <Space direction='vertical' align='center' size='middle'>
          <Space direction='vertical' align='center'>
            <Typography.Text>LED Count</Typography.Text>
            <NumberInput
              value={ledCount}
              disabled={disabled || ledDisabled}
              onChange={(newValue, manuallyTyped) => {
                if (manuallyTyped) onLedChange(newValue);
              }}
              onIncrement={onLedChange}
              onDecrement={onLedChange}
            />
          </Space>
          <Space direction='vertical' align='center'>
            <Typography.Text>Ball Count</Typography.Text>
            <NumberInput
              value={ballCount}
              disabled={disabled}
              onChange={(newValue, manuallyTyped) => {
                if (manuallyTyped) onBallChange(newValue);
              }}
              onIncrement={onBallChange}
              onDecrement={onBallChange}
            />
          </Space>
        </Space>
      </Space>
    </Card>
  );
};
