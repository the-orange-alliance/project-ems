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
import { FC, useMemo } from 'react';
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
import { useSocketSubscriptions } from 'src/api/use-socket-subscriptions.js';

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

  const subscriptions = useMemo(
    () => [
      {
        key: MatchSocketEvent.PRESTART,
        callback: onPrestart
      },
      {
        key: MatchSocketEvent.START,
        callback: onStart
      },
      {
        key: MatchSocketEvent.ABORT,
        callback: onAbort
      },
      {
        key: 'timer:transition',
        callback: onTransition
      },
      {
        key: 'timer:tele',
        callback: onTele
      },
      {
        key: 'timer:endgame',
        callback: onEndgame
      },
      {
        key: 'timer:end',
        callback: onEnd
      }
    ],
    [onPrestart, onStart, onAbort, onTransition, onTele, onEndgame, onEnd]
  );

  useSocketSubscriptions(worker, connected, subscriptions);

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
