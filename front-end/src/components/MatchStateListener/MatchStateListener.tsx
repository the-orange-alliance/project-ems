import { MatchSocketEvent, MatchState } from '@toa-lib/models';
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
      socket?.on(MatchSocketEvent.PRESTART, onMatchPrestart);
      socket?.on(MatchSocketEvent.START, onMatchStart);
      socket?.on(MatchSocketEvent.END, onMatchEnd);
      socket?.on(MatchSocketEvent.ABORT, onMatchAbort);

      socket?.on(MatchSocketEvent.TELEOPERATED, onMatchTele);
      socket?.on(MatchSocketEvent.ENDGAME, onMatchEndGame);
    }
  }, [connected]);

  useEffect(() => {
    return () => {
      socket?.off(MatchSocketEvent.PRESTART, onMatchPrestart);
      socket?.off(MatchSocketEvent.START, onMatchStart);
      socket?.off(MatchSocketEvent.END, onMatchEnd);
      socket?.off(MatchSocketEvent.ABORT, onMatchAbort);

      socket?.off(MatchSocketEvent.TELEOPERATED, onMatchTele);
      socket?.off(MatchSocketEvent.ENDGAME, onMatchEndGame);
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
