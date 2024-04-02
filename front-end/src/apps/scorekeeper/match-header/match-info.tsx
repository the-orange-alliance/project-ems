import { Box, Chip, Paper, Typography } from '@mui/material';
import { FC } from 'react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

export const MatchInfo: FC = () => {
  const connected = false;
  return (
    <Paper sx={{ height: '100%' }}>
      <Box
        sx={{
          padding: (theme) => theme.spacing(2),
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <Typography align='center' variant='h4'>
          2:30
        </Typography>
        <Typography gutterBottom align='center' variant='body1'>
          UNKNOWN
        </Typography>
        <Chip
          icon={connected ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon />}
          label={connected ? 'Connected' : 'Not Connected'}
          color={connected ? 'success' : 'error'}
        />
      </Box>
    </Paper>
  );
};
