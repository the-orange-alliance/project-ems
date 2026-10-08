import type {
  TimerEventName,
  TimerMessage
} from '@workers/shared-match-timer-worker.js';
import {
  MATCH_END,
  MATCH_ENDGAME,
  MATCH_START,
  MATCH_TELE,
  MATCH_TRANSITION,
  MATCH_ABORT,
  initAudio
} from './index.js';

const CUE_SOUNDS: Partial<Record<TimerEventName, HTMLAudioElement>> = {
  'timer:start': initAudio(MATCH_START),
  'timer:transition': initAudio(MATCH_TRANSITION),
  'timer:tele': initAudio(MATCH_TELE),
  'timer:endgame': initAudio(MATCH_ENDGAME),
  'timer:end': initAudio(MATCH_END),
  'timer:abort': initAudio(MATCH_ABORT)
};

/** The timer events that have a sound. */
export const TIMER_CUE_EVENTS = Object.keys(CUE_SOUNDS) as TimerEventName[];

/**
 * Plays the sound for a timer event. The timer marks the events that should be
 * heard with `allowAudio`; the ones it raises alongside a start, or while
 * catching up after a missed tick, are silent so nothing sounds twice or late.
 */
export const playTimerCue = ({ event, payload }: TimerMessage): void => {
  if (!event || payload?.allowAudio !== true) return;
  const sound = CUE_SOUNDS[event];
  if (!sound) return;
  console.log(`Playing timer cue for event "${event}".`);
  sound.currentTime = 0;
  // Browsers reject playback until the user has interacted with the page.
  sound.play().catch((error) => {
    console.warn(`Timer cue "${event}" could not be played.`, error);
  });
};
