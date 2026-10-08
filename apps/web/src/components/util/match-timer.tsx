import {
  FGC_MATCH_CONFIG,
  FRC_MATCH_CONFIG,
  MatchConfiguration,
  MatchKey,
  MatchSocketEvent,
  getSeasonKeyFromEventKey
} from '@toa-lib/models';
import { useAtomValue } from 'jotai';
import { Duration } from 'luxon';
import { FC } from 'react';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { useSocketSubscriptions } from 'src/api/use-socket-subscriptions.js';
import { useMatchTimerWorker } from 'src/api/use-timer-worker.js';
import { useTimerSubscriptions } from 'src/api/use-timer-subscriptions.js';
import {
  TIMER_CUE_EVENTS,
  playTimerCue
} from 'src/apps/audience-display/audio/timer-cues.js';
import { matchAtom } from 'src/stores/state/event.js';

const getTimerConfig = (eventKey: string): MatchConfiguration =>
  getSeasonKeyFromEventKey(eventKey).toLowerCase().includes('frc')
    ? FRC_MATCH_CONFIG
    : FGC_MATCH_CONFIG;

const AUDIO_SUBSCRIPTIONS = TIMER_CUE_EVENTS.map((key) => ({
  key,
  callback: playTimerCue
}));

interface Props {
  /** Play a sound on each timer cue (start, phase changes, end). */
  audio?: boolean;
  mode?: 'modeTime' | 'timeLeft';
}

export const MatchTimer: FC<Props> = ({ audio, mode = 'timeLeft' }) => {
  const { timeLeft, subscribe, start, abort, reset, setConfig } =
    useMatchTimerWorker();
  const currentMatch = useAtomValue(matchAtom);
  const { connected, worker } = useSocketWorker();

  // The socket only starts the clock (or readies or stops it); it never plays a sound.
  useSocketSubscriptions(worker, connected, [
    {
      key: MatchSocketEvent.PRESTART,
      callback: (match: MatchKey) => {
        setConfig(getTimerConfig(match.eventKey));
        reset();
      }
    },
    {
      key: MatchSocketEvent.START,
      callback: () => {
        if (currentMatch) setConfig(getTimerConfig(currentMatch.eventKey));
        start();
      }
    },
    { key: MatchSocketEvent.ABORT, callback: abort }
  ]);

  // The sounds come from the clock's own segments.
  useTimerSubscriptions(subscribe, audio ? AUDIO_SUBSCRIPTIONS : []);

  const timeDuration = Duration.fromObject({
    seconds: mode === 'timeLeft' ? timeLeft : 0 // modeTime is not available from the worker
  });

  return (
    <>
      {mode === 'timeLeft'
        ? timeDuration.toFormat('m:ss')
        : timeDuration.toFormat('s')}
    </>
  );
};
