import { EventSchedule } from '@toa-lib/models';
import { FC } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

interface Props {
  schedule: EventSchedule;
}

const Days: FC<Props> = ({ schedule }) => {
  return (
    <Box>
      <Button variant='contained'>Add Day</Button>
    </Box>
  );
};

export default Days;
