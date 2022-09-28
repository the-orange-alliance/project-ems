import { FC, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography'

const RefereeSheet: FC<{alliance?: string}> = ({alliance}) => {
  return (
    <Paper sx={{ padding: (theme) => theme.spacing(2), borderStyle: 'solid', borderWidth: 'thick', borderColor: alliance == 'red' ? '#de1f1f' : '#1f85de' }}>
      <Typography variant='h4' sx={{ textAlign: 'center' }}>
        {alliance == 'red' ? 'Red' : 'Blue'} Alliance
      </Typography>
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
