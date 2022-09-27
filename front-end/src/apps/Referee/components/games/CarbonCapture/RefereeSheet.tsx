import { FC, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';

const RefereeSheet: FC = () => {
  return (
    <Paper sx={{ padding: (theme) => theme.spacing(2) }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
        <Button
          fullWidth
          variant='contained'
          className='yellow-bg-imp'
          sx={{ height: '10em' }}
        >
          Yellow Card
        </Button>
        <Button
          fullWidth
          variant='contained'
          className='red-bg-imp'
          sx={{ height: '10em' }}
        >
          Red Card
        </Button>
      </Box>
    </Paper>
  );
};

export default RefereeSheet;
