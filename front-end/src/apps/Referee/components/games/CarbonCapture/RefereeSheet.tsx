import { FC } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import StorageLevelInput from './StorageLevelInput';
import PenaltyInput from './PenaltyInput';

const RefereeSheet: FC<{alliance?: string}> = ({alliance}) => {
  return (
    <Paper sx={{ padding: (theme) => theme.spacing(2), borderStyle: 'solid', borderWidth: 'thick', borderColor: alliance == 'red' ? '#de1f1f' : '#1f85de', width: '100%' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: '16px'}}>
        <Typography variant='h4' sx={{ textAlign: 'center' }}>
          {alliance == 'red' ? 'Red' : 'Blue'} Alliance
        </Typography>
        <StorageLevelInput />
        <PenaltyInput />
      </Box>
    </Paper>
  );
};

export default RefereeSheet;
