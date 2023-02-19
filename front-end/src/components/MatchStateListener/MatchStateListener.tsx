import { MatchState } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import { useSocket } from 'src/api/SocketProvider';
import { matchStatusAtom, matchStateAtom } from 'src/stores/NewRecoil';

const MatchStateListener: FC = () => {
  const setState = useSetRecoilState(matchStateAtom);
  const setMode = useSetRecoilState(matchStatusAtom);
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on('match:prestart', onMatchPrestart);
      socket?.on('match:start', onMatchStart);
      socket?.on('match:end', onMatchEnd);
      socket?.on('match:abort', onMatchAbort);

      socket?.on('match:tele', onMatchTele);
      socket?.on('match:endgame', onMatchEndGame);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.off('match:prestart', onMatchPrestart);
      socket?.off('match:start', onMatchStart);
      socket?.off('match:end', onMatchEnd);
      socket?.off('match:abort', onMatchAbort);

      socket?.off('match:tele', onMatchTele);
      socket?.off('match:endgame', onMatchEndGame);
    };
  }, []);

  const onMatchPrestart = () => {
    setState(MatchState.PRESTART_COMPLETE);
    setMode('PRESTART COMPLETE');
  };

  const onMatchStart = () => {
    setState(MatchState.MATCH_IN_PROGRESS);
    setMode('MATCH STARTED');
  };
  const onMatchEnd = () => {
    setState(MatchState.MATCH_COMPLETE);
    setMode('MATCH COMPLETE');
  };
  const onMatchAbort = () => {
    setState(MatchState.MATCH_ABORTED);
    setMode('MATCH ABORTED');
  };

  const onMatchTele = () => setMode('TELEOPERATED');
  const onMatchEndGame = () => setMode('ENDGAME');

  return null;
};

export default MatchStateListener;
