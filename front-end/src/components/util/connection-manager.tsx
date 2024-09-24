import { MatchKey, MatchSocketEvent } from '@toa-lib/models';
import { FC, useEffect } from 'react';
import { useSocket } from 'src/api/use-socket';
import * as Events from 'src/api/events';

export const ConnectionManager: FC = () => {
  const [socket, , setupSocket] = useSocket();
  const handleDisplay = Events.useDisplayEvent();
  const handleCommit = Events.useCommitEvent();
  const handleUpdate = Events.useMatchUpdateEvent();
  const handlePrestart = Events.usePrestartEvent();
  const {
    handleMatchAbort,
    handleMatchEnd,
    handleMatchEndgame,
    handleMatchPrestart,
    handleMatchStart,
    handleMatchTeleop
  } = Events.useMatchStateEvents();
  useEffect(() => {
    setupSocket('token');
    if (!socket) return;
    socket.on(MatchSocketEvent.ABORT, handleMatchAbort);
    socket.on(MatchSocketEvent.END, handleMatchEnd);
    socket.on(MatchSocketEvent.ENDGAME, handleMatchEndgame);
    socket.on(MatchSocketEvent.TELEOPERATED, handleMatchTeleop);
    socket.on(MatchSocketEvent.PRESTART, handleMatchPrestart);
    socket.on(MatchSocketEvent.START, handleMatchStart);
    socket.on(MatchSocketEvent.UPDATE, handleUpdate);
    socket.on(MatchSocketEvent.DISPLAY, handleDisplay);
    socket.on(MatchSocketEvent.COMMIT, handleCommit);
    socket.on(MatchSocketEvent.PRESTART, handlePrestartEvents);
    return () => {
      socket.off(MatchSocketEvent.ABORT, handleMatchAbort);
      socket.off(MatchSocketEvent.END, handleMatchEnd);
      socket.off(MatchSocketEvent.ENDGAME, handleMatchEndgame);
      socket.off(MatchSocketEvent.TELEOPERATED, handleMatchTeleop);
      socket.off(MatchSocketEvent.PRESTART, handleMatchPrestart);
      socket.off(MatchSocketEvent.START, handleMatchStart);
      socket.off(MatchSocketEvent.UPDATE, handleUpdate);
      socket.off(MatchSocketEvent.DISPLAY, handleDisplay);
      socket.off(MatchSocketEvent.COMMIT, handleCommit);
      socket.off(MatchSocketEvent.PRESTART, handlePrestartEvents);
    };
  }, [socket]);
  const handlePrestartEvents = (key: MatchKey) => {
    handlePrestart(key);
    handleMatchPrestart();
  };
  return null;
};
