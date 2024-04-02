import { Box, Chip, Paper, Typography } from '@mui/material';
import { FC } from 'react';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { MatchTimer } from 'src/components/util/match-timer';
import { useRecoilValue } from 'recoil';
import { matchStatusAtom } from 'src/stores/recoil';
import { useSocket } from 'src/api/use-socket';

export const MatchInfo: FC = () => {
  const matchState = useRecoilValue(matchStatusAtom);
  const [, connected] = useSocket();
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
          <MatchTimer />
        </Typography>
        <Typography gutterBottom align='center' variant='body1'>
          {matchState}
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
