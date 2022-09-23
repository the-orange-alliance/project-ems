import { FC, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useRecoilState, useRecoilValue } from 'recoil';
import { matchTimeAtom, selectedMatchSelector, timer } from 'src/stores/Recoil';
import {
  removeMatchListeners,
  setupMatchListeners,
  useSocket
} from 'src/api/SocketProvider';
import { duration } from 'moment';

const MatchStatus: FC = () => {
  const selectedMatch = useRecoilValue(selectedMatchSelector);
  const [time, setTime] = useRecoilState(matchTimeAtom);

  const [mode, setMode] = useState('NOT READY');

  const [socket, connected] = useSocket();

  const name = selectedMatch ? selectedMatch.matchName : 'No Match Selected';
  const timeDuration = duration(time, 'seconds');
  const displayMinutes =
    timeDuration.minutes() < 10
      ? '0' + timeDuration.minutes().toString()
      : timeDuration.minutes().toString();
  const displaySeconds =
    timeDuration.seconds() < 10
      ? '0' + timeDuration.seconds().toString()
      : timeDuration.seconds().toString();

  useEffect(() => {
    if (connected) {
      setupMatchListeners(
        onMatchStart,
        onMatchAuto,
        onMatchTele,
        onMatchEndGame,
        onMatchEnd,
        onMatchAbort
      );
    }
  }, [connected, socket]);

  useEffect(() => {
    return () => {
      removeMatchListeners();
    };
  }, []);

  useEffect(() => {
    setTime(timer.timeLeft);
  }, [timer.timeLeft]);

  const onMatchStart = (data: any) => {
    console.log('MATCH STARTED', data);
    timer.start();
    setMode('MATCH STARTED');
  };
  const onMatchAuto = () => setMode('AUTONOMOUS');
  const onMatchTele = () => setMode('TELEOPERATED');
  const onMatchEndGame = () => setMode('ENDGAME');
  const onMatchEnd = () => setMode('MATCH END');
  const onMatchAbort = () => {
    timer.abort();
    setMode('MATCH ABORTED');
  };

  return (
    <Paper sx={{ paddingBottom: (theme) => theme.spacing(2), height: '100%' }}>
      <Box sx={{ padding: (theme) => theme.spacing(2) }}>
        <Typography align='center'>{name}</Typography>
      </Box>
      <Divider />
      <Box sx={{ padding: (theme) => theme.spacing(2) }}>
        <Typography align='center' variant='h5'>
          {mode}
        </Typography>
        <Typography align='center' variant='h5'>
          {displayMinutes}:{displaySeconds}
        </Typography>
      </Box>
    </Paper>
  );
};

export default MatchStatus;
