import { MatchKey, MatchSocketEvent } from '@toa-lib/models';
import { FC, useEffect, useMemo } from 'react';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import * as Events from 'src/api/events/index.js';
import { proxy } from 'comlink';

export const ConnectionManager: FC = () => {
  const { worker, connected } = useSocketWorker();
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

  const handlePrestartEvents = (key: MatchKey) => {
    handlePrestart(key);
    handleMatchPrestart();
  };

  const abortProxy = useMemo(() => proxy(handleMatchAbort), [handleMatchAbort]);
  const endProxy = useMemo(() => proxy(handleMatchEnd), [handleMatchEnd]);
  const endgameProxy = useMemo(
    () => proxy(handleMatchEndgame),
    [handleMatchEndgame]
  );
  const teleopProxy = useMemo(
    () => proxy(handleMatchTeleop),
    [handleMatchTeleop]
  );
  const prestartProxy = useMemo(
    () => proxy(handlePrestartEvents),
    [handleMatchPrestart]
  );
  const startProxy = useMemo(() => proxy(handleMatchStart), [handleMatchStart]);
  const updateProxy = useMemo(() => proxy(handleUpdate), [handleUpdate]);
  const displayProxy = useMemo(() => proxy(handleDisplay), [handleDisplay]);
  const commitProxy = useMemo(() => proxy(handleCommit), [handleCommit]);

  useEffect(() => {
    if (!worker || !connected) return;
    worker.on(MatchSocketEvent.ABORT, abortProxy);
    worker.on(MatchSocketEvent.END, endProxy);
    worker.on(MatchSocketEvent.ENDGAME, endgameProxy);
    worker.on(MatchSocketEvent.TELEOPERATED, teleopProxy);
    worker.on(MatchSocketEvent.START, startProxy);
    worker.on(MatchSocketEvent.UPDATE, updateProxy);
    worker.on(MatchSocketEvent.DISPLAY, displayProxy);
    worker.on(MatchSocketEvent.COMMIT, commitProxy);
    worker.on(MatchSocketEvent.PRESTART, prestartProxy);
    return () => {
      worker.off(MatchSocketEvent.ABORT, abortProxy);
      worker.off(MatchSocketEvent.END, endProxy);
      worker.off(MatchSocketEvent.ENDGAME, endgameProxy);
      worker.off(MatchSocketEvent.TELEOPERATED, teleopProxy);
      worker.off(MatchSocketEvent.START, startProxy);
      worker.off(MatchSocketEvent.UPDATE, updateProxy);
      worker.off(MatchSocketEvent.DISPLAY, displayProxy);
      worker.off(MatchSocketEvent.COMMIT, commitProxy);
      worker.off(MatchSocketEvent.PRESTART, prestartProxy);
    };
  }, [worker, connected]);
  return null;
};
