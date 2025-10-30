import { Button } from 'antd';
import { FC } from 'react';

interface Props {
  disabled?: boolean;
  onClick: () => void;
  onReassignTimes: () => void;
}

export const ScheduleMatchFooter: FC<Props> = ({
  disabled,
  onClick,
  onReassignTimes
}) => {
  return (
    <>
      <Button
        style={{ marginTop: '2em' }}
        disabled={disabled}
        onClick={onClick}
      >
        Post Schedule
      </Button>
      <Button
        style={{ marginTop: '2em' }}
        disabled={disabled}
        onClick={onReassignTimes}
      >
        Update Match Times
      </Button>
    </>
  );
};
