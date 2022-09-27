import { FC, useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useRecoilCallback, useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import {
  loadedMatch,
  loadedMatchKey,
  matchInProgressAtom,
  matchStateAtom
} from 'src/stores/Recoil';
import {
  commitScoresLED,
  endGameFlash,
  updateSink,
  useSocket
} from 'src/api/SocketProvider';
import MatchCountdown from 'src/features/components/MatchCountdown/MatchCountdown';
import { isCarbonCaptureDetails, Match, MatchState } from '@toa-lib/models';

const MatchStatus: FC = () => {
  const selectedMatch = useRecoilValue(loadedMatch);
  const setState = useSetRecoilState(matchStateAtom);

  const [match, setMatch] = useRecoilState(
    matchInProgressAtom(selectedMatch?.matchKey || '')
  );

  const [mode, setMode] = useState('NOT READY');

  const [socket, connected] = useSocket();

  const name = selectedMatch ? selectedMatch.matchName : 'No Match Selected';

  useEffect(() => {
    if (connected) {
      socket?.on('match:prestart', onMatchPrestart);
      socket?.on('match:auto', onMatchAuto);
      socket?.on('match:tele', onMatchTele);
      socket?.on('match:endgame', onMatchEndGame);
      socket?.on('match:end', onMatchEnd);
      socket?.on('match:abort', onMatchAbort);
      socket?.on('match:update', onMatchUpdate);
    }
  }, [connected, socket]);

  useEffect(() => {
    return () => {
      socket?.removeListener('match:prestart', onMatchPrestart);
      socket?.removeListener('match:auto', onMatchAuto);
      socket?.removeListener('match:tele', onMatchTele);
      socket?.removeListener('match:endgame', onMatchEndGame);
      socket?.removeListener('match:end', onMatchEnd);
      socket?.removeListener('match:abort', onMatchAbort);
      socket?.removeListener('match:update', onMatchUpdate);
    };
  }, []);

  const onMatchPrestart = () => setMode('PRESTART COMPLETE');
  const onMatchAuto = () => setMode('AUTONOMOUS');
  const onMatchTele = () => setMode('TELEOPERATED');
  const onMatchEndGame = useRecoilCallback(({ snapshot }) => async () => {
    setMode('ENDGAME');
    const matchKey = await snapshot.getPromise(loadedMatchKey);
    const thisMatch = await snapshot.getPromise(matchInProgressAtom(matchKey || ''))
    endGameFlash((thisMatch?.details as any)?.carbonPoints);
  });
  const onMatchEnd = () => {
    setMode('MATCH END');
    setState(MatchState.MATCH_COMPLETE);
    //TODO change this to correct LED pattern
    commitScoresLED();
  };
  const onMatchAbort = () => {
    setMode('MATCH ABORTED');
  };
  const onMatchUpdate = useRecoilCallback(({ set }) => async (match: Match) => {
    if (match.details && isCarbonCaptureDetails(match.details)) {
      await updateSink(match.details.carbonPoints);
    }
    set(matchInProgressAtom(match.matchKey), match);
  });

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
          <MatchCountdown />
        </Typography>
      </Box>
    </Paper>
  );
};

export default MatchStatus;
