import { Button } from 'antd';
import { FC } from 'react';

interface Props {
  disabled?: boolean;
  onClick: () => void;
}

export const ScheduleMatchFooter: FC<Props> = ({ disabled, onClick }) => {
  return (
    <Button style={{ marginTop: '2em' }} disabled={disabled} onClick={onClick}>
      Post Schedule
    </Button>
  );
};
