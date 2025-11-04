import {
  FGC_MATCH_CONFIG,
  FRC_MATCH_CONFIG,
  MatchKey,
  MatchSocketEvent,
  TimerEventPayload,
  getSeasonKeyFromEventKey
} from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { Duration } from 'luxon';
import { FC, useEffect, useMemo } from 'react';
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
  const { timeLeft, start, abort, reset } = useMatchTimerWorker();
  const currentMatch = useAtomValue(matchAtom);
  const { connected, worker } = useSocketWorker();

  const onPrestart = (e: MatchKey) => {
    reset();
    determineTimerConfig(e.eventKey);
  };

  const onStart = () => {
    if (audio) startAudio.play();
    if (currentMatch) determineTimerConfig(currentMatch.eventKey);
    start();
  };
  const onTransition = (payload: TimerEventPayload) => {
    if (audio && payload.allowAudio) transitionAudio.play();
  };
  const onTele = (payload: TimerEventPayload) => {
    if (audio && payload.allowAudio) teleAudio.play();
  };
  const onAbort = () => {
    if (audio) abortAudio.play();
    abort();
  };
  const onEnd = (payload: TimerEventPayload) => {
    if (audio && payload.allowAudio) endAudio.play();
    stop();
  };
  const onEndgame = (payload: TimerEventPayload) => {
    if (audio && payload.allowAudio) endgameAudio.play();
  };

  const prestartProxy = useMemo(() => Comlink.proxy(onPrestart), [onPrestart]);
  const startProxy = useMemo(() => Comlink.proxy(onStart), [onStart]);
  const abortProxy = useMemo(() => Comlink.proxy(onAbort), [onAbort]);
  const transitionProxy = useMemo(
    () => Comlink.proxy(onTransition),
    [onTransition]
  );
  const teleProxy = useMemo(() => Comlink.proxy(onTele), [onTele]);
  const endProxy = useMemo(() => Comlink.proxy(onEnd), [onEnd]);
  const endgameProxy = useMemo(() => Comlink.proxy(onEndgame), [onEndgame]);

  useEffect(() => {
    if (connected) {
      worker?.on(MatchSocketEvent.PRESTART, prestartProxy);
      worker?.on(MatchSocketEvent.START, startProxy);
      worker?.on(MatchSocketEvent.ABORT, abortProxy);

      worker?.on('timer:transition', transitionProxy);
      worker?.on('timer:tele', teleProxy);
      worker?.on('timer:endgame', endProxy);
      worker?.on('timer:end', endgameProxy);
    }

    return () => {
      if (connected) {
        worker?.off(MatchSocketEvent.PRESTART, prestartProxy);
        worker?.off(MatchSocketEvent.START, startProxy);
        worker?.off(MatchSocketEvent.ABORT, abortProxy);

        worker?.off('timer:transition', transitionProxy);
        worker?.off('timer:tele', teleProxy);
        worker?.off('timer:endgame', endgameProxy);
        worker?.off('timer:end', endProxy);
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
