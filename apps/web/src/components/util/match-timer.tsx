import {
  FGC_MATCH_CONFIG,
  FRC_MATCH_CONFIG,
  MatchKey,
  MatchSocketEvent,
  getSeasonKeyFromEventKey
} from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { Duration } from 'luxon';
import { FC, useEffect, useMemo, useRef } from 'react';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { useMatchTimerWorker } from 'src/api/use-timer-worker.js';
import {
  initAudio,
  MATCH_START,
  MATCH_TELE,
  MATCH_TRANSITION,
  MATCH_ABORT,
  MATCH_ENDGAME,
  MATCH_END
} from 'src/apps/audience-display/audio/index.js';
import { matchAtom } from 'src/stores/state/event.js';
import * as Comlink from 'comlink';

const startAudio = initAudio(MATCH_START);
const transitionAudio = initAudio(MATCH_TRANSITION);
const teleAudio = initAudio(MATCH_TELE);
const abortAudio = initAudio(MATCH_ABORT);
const endgameAudio = initAudio(MATCH_ENDGAME);
const endAudio = initAudio(MATCH_END);

interface Props {
  audio?: boolean;
  mode?: 'modeTime' | 'timeLeft';
}

export const MatchTimer: FC<Props> = ({ audio, mode = 'timeLeft' }) => {
  const {
    timeLeft,
    mode: timerMode,
    inProgress,
    setConfig,
    start,
    abort,
    reset
  } = useMatchTimerWorker();
  const currentMatch = useAtomValue(matchAtom);
  const { connected, worker } = useSocketWorker();

  const prevInProgressRef = useRef(inProgress);
  const prevTimerModeRef = useRef(timerMode);

  const onPrestart = (e: MatchKey) => {
    reset();
    const config = determineTimerConfig(e.eventKey);
    setConfig(config);
  };

  const onStart = () => {
    if (currentMatch) {
      const config = determineTimerConfig(currentMatch.eventKey);
      setConfig(config);
    }
    start();
  };

  const onAbort = () => {
    if (audio) abortAudio.play();
    abort();
  };

  const prestartProxy = useMemo(() => Comlink.proxy(onPrestart), [onPrestart]);
  const startProxy = useMemo(() => Comlink.proxy(onStart), [onStart]);
  const abortProxy = useMemo(() => Comlink.proxy(onAbort), [onAbort]);

  useEffect(() => {
    if (audio) {
      const prevInProgress = prevInProgressRef.current;
      const prevTimerMode = prevTimerModeRef.current;

      if (inProgress && !prevInProgress) {
        startAudio.play();
      } else if (!inProgress && prevInProgress) {
        // This could be abort or end
      }

      if (timerMode !== prevTimerMode) {
        if (timerMode === 1) {
          // Assuming 1 is transition
          transitionAudio.play();
        } else if (timerMode === 2) {
          // Assuming 2 is teleop
          teleAudio.play();
        } else if (timerMode === 3) {
          // Assuming 3 is endgame
          endgameAudio.play();
        } else if (timerMode === 0 && prevTimerMode !== 0) {
          endAudio.play();
        }
      }

      prevInProgressRef.current = inProgress;
      prevTimerModeRef.current = timerMode;
    }
  }, [inProgress, timerMode, audio]);

  useEffect(() => {
    if (connected) {
      worker?.on(MatchSocketEvent.PRESTART, prestartProxy);
      worker?.on(MatchSocketEvent.START, startProxy);
      worker?.on(MatchSocketEvent.ABORT, abortProxy);
    }

    return () => {
      if (connected) {
        worker?.off(MatchSocketEvent.PRESTART, prestartProxy);
        worker?.off(MatchSocketEvent.START, startProxy);
        worker?.off(MatchSocketEvent.ABORT, abortProxy);
      }
    };
  }, [connected, worker]);

  const timeDuration = Duration.fromObject({
    seconds: mode === 'timeLeft' ? timeLeft : 0 // modeTime is not available from the worker
  });

  const determineTimerConfig = (eventKeyLike: string) => {
    // Get season key frome event key
    const seasonKey = getSeasonKeyFromEventKey(eventKeyLike).toLowerCase();

    // Set match config based on season key
    return seasonKey.includes('frc') ? FRC_MATCH_CONFIG : FGC_MATCH_CONFIG;
  };

  return (
    <>
      {mode === 'timeLeft'
        ? timeDuration.toFormat('m:ss')
        : timeDuration.toFormat('s')}
    </>
  );
};
