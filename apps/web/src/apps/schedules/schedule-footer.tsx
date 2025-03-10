import { Button, Typography } from '@mui/material';
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
    <>
      <Button
        variant='contained'
        sx={{
          marginTop: (theme) => theme.spacing(2),
          marginBottom: (theme) => theme.spacing(2)
        }}
        onClick={onGenerateSchedule}
        disabled={disabled}
      >
        Generate Schedule
      </Button>
      <Typography>{message}</Typography>
    </>
  );
};
