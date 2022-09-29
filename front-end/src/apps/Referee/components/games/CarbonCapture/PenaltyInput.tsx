import { FC } from 'react';
import { Typography, Box, Button } from '@mui/material';
import NumberInput from '../../NumberInput';

const PenaltyInput: FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        alignItems: 'center'
      }}
    >
      <Typography variant='h6'>Foul Count</Typography>
      <NumberInput />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          gap: '16px',
          width: '100%'
        }}
      >
        <Button
          fullWidth
          variant='contained'
          className='yellow-bg-imp'
          sx={{ height: '8em' }}
        >
          Yellow Card
        </Button>
        <Button
          fullWidth
          variant='contained'
          className='red-bg-imp'
          sx={{ height: '8em' }}
        >
          Red Card
        </Button>
      </Box>
    </Box>
  );
};

export default PenaltyInput;
