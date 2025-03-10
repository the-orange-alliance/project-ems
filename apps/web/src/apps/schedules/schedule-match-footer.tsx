import { Button } from '@mui/material';
import { FC } from 'react';

interface Props {
  disabled?: boolean;
  onClick: () => void;
}

export const ScheduleMatchFooter: FC<Props> = ({ disabled, onClick }) => {
  return (
    <Button
      sx={{ marginTop: (theme) => theme.spacing(2) }}
      variant='contained'
      disabled={disabled}
      onClick={onClick}
    >
      Post Schedule
    </Button>
  );
};
