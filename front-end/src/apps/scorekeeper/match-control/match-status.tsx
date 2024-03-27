import { Box, Chip, Divider, Paper, Typography } from '@mui/material';
import { FC } from 'react';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export const MatchStatus: FC = () => {
  return (
    <Paper sx={{ height: '100%' }}>
      <Box
        sx={{
          padding: (theme) => theme.spacing(2),
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}
      >
        <Typography align='center'>Match Status</Typography>
        <Chip
          icon={<CheckCircleOutlineIcon />}
          label='Match Started'
          color='primary'
          variant='outlined'
        />
      </Box>
      <Divider />
      <Box sx={{ padding: (theme) => theme.spacing(2) }}>
        <Typography gutterBottom align='center' variant='body1'>
          Match Status
        </Typography>
        <Typography align='center' variant='h4'>
          Match Countdown
        </Typography>
      </Box>
    </Paper>
  );
};
