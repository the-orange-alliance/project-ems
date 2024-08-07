import { FC } from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';

export const AllianceCards: FC = () => {

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Box sx={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
        <Button
          fullWidth
          variant='contained'
          className='red-bg-imp'
          sx={{ height: '30em' }}
          component={Link}
          to='./red'
        >
          Red Alliance
        </Button>
        <Button
          fullWidth
          variant='contained'
          className='blue-bg-imp'
          sx={{ height: '30em' }}
          component={Link}
          to='./blue'
        >
          Blue Alliance
        </Button>
      </Box>
      <Button
        fullWidth
        variant='contained'
        className='yellow-bg-imp'
        sx={{ height: '30em' }}
        component={Link}
        to='./head'
      >
        Head Referee
      </Button>
    </Box>
  );
};
