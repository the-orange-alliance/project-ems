import { Button, Typography } from 'antd';
import { FC } from 'react';

interface Props {
  message?: string;
  disabled?: boolean;
  onGenerateSchedule: () => void;
}

export const ScheduleFooter: FC<Props> = ({
  message,
  disabled,
  onGenerateSchedule
}) => {
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type='primary'
          style={{ marginTop: 16, marginBottom: 8 }}
          onClick={onGenerateSchedule}
          disabled={disabled}
        >
          Generate Schedule
        </Button>
      </div>
      <div style={{ textAlign: 'right', marginBottom: 16 }}>
        <Typography.Text>{message}</Typography.Text>
      </div>
    </div>
  );
};
