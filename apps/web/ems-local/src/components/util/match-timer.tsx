import {
  FGC_MATCH_CONFIG,
  FRC_MATCH_CONFIG,
  MatchKey,
  MatchMode,
  MatchSocketEvent,
  MatchState,
  TimerEventPayload,
  getSeasonKeyFromEventKey
} from '@toa-lib/models';
import { useAtom, useAtomValue } from 'jotai';
import { Duration } from 'luxon';
import { FC, useEffect } from 'react';
import { useSocket } from 'src/api/use-socket.js';
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
import {
  matchStateAtom,
  matchTimeAtom,
  matchTimeModeAtom,
  timer
} from 'src/stores/state/match.js';

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
  const matchState = useAtomValue(matchStateAtom);
  const [time, setTime] = useAtom(matchTimeAtom);
  const [modeTime, setModeTime] = useAtom(matchTimeModeAtom);
  const currentMatch = useAtomValue(matchAtom);
  const [socket, connected] = useSocket();

  useEffect(() => {
    if (connected) {
      socket?.on(MatchSocketEvent.PRESTART, onPrestart);
      socket?.on(MatchSocketEvent.START, onStart);
      socket?.on(MatchSocketEvent.ABORT, onAbort);
      socket?.on(MatchSocketEvent.TIMER, onTimer);

      socket?.emit(MatchSocketEvent.TIMER);

      timer.on('timer:transition', onTransition);
      timer.on('timer:tele', onTele);
      timer.on('timer:endgame', onEndgame);
      timer.on('timer:end', onEnd);
    }
  }, [connected]);

  useEffect(() => {
    if (!timer.inProgress()) {
      timer.reset();
      setTime(timer.timeLeft);
      setModeTime(timer.modeTimeLeft);
    }

    const tick = setInterval(() => {
      setTime(timer.timeLeft);
      setModeTime(timer.modeTimeLeft);
    }, 500);

    return () => {
      socket?.off(MatchSocketEvent.PRESTART, onPrestart);
      socket?.off(MatchSocketEvent.START, onStart);
      socket?.off(MatchSocketEvent.ABORT, onAbort);

      timer.off('timer:transition', onTransition);
      timer.off('timer:tele', onTele);
      timer.off('timer:endgame', onEndgame);
      timer.off('timer:end', onEnd);
      clearInterval(tick);
    };
  }, []);

  useEffect(() => {
    if (matchState === MatchState.MATCH_IN_PROGRESS && timer.inProgress()) {
      setTime(timer.timeLeft);
      setModeTime(timer.modeTimeLeft);
    }
  }, [matchState]);

  const timeDuration = Duration.fromObject({
    seconds: mode === 'timeLeft' ? time : modeTime
  });

  const onPrestart = (e: MatchKey) => {
    timer.reset();

    determineTimerConfig(e.eventKey);

    setTime(timer.timeLeft);
  };

  const onStart = () => {
    if (audio) startAudio.play();
    if (currentMatch) determineTimerConfig(currentMatch.eventKey);
    timer.start();
  };
  const onTransition = (payload: TimerEventPayload) => {
    if (audio && payload.allowAudio) transitionAudio.play();
  };
  const onTele = (payload: TimerEventPayload) => {
    if (audio && payload.allowAudio) teleAudio.play();
  };
  const onAbort = () => {
    if (audio) abortAudio.play();
    timer.abort();
  };
  const onEnd = (payload: TimerEventPayload) => {
    if (audio && payload.allowAudio) endAudio.play();
    timer.stop();
  };
  const onEndgame = (payload: TimerEventPayload) => {
    if (audio && payload.allowAudio) endgameAudio.play();
  };
  const onTimer = ({
    timeLeft,
    modeTimeLeft,
    mode,
    inProgress
  }: {
    timeLeft: number;
    modeTimeLeft: number;
    mode: MatchMode;
    inProgress: boolean;
  }) => {
    if (inProgress) timer.start();
    timer.modeTimeLeft = modeTimeLeft;
    timer.mode = mode;
    timer.timeLeft = timeLeft;
  };

  const determineTimerConfig = (eventKeyLike: string) => {
    // Get season key frome event key
    const seasonKey = getSeasonKeyFromEventKey(eventKeyLike).toLowerCase();

    // Set match config based on season key
    const matchConfig = seasonKey.includes('frc')
      ? FRC_MATCH_CONFIG
      : FGC_MATCH_CONFIG;
    timer.matchConfig = matchConfig;
  };

  return (
    <>
      {mode === 'timeLeft'
        ? timeDuration.toFormat('m:ss')
        : timeDuration.toFormat('s')}
    </>
  );
};
