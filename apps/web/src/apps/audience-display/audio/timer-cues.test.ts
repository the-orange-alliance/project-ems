import type {
  TimerEventName,
  TimerMessage
} from '@workers/shared-match-timer-worker.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeAudio {
  currentTime: number;
  play: ReturnType<typeof vi.fn>;
}

const sounds = vi.hoisted(() => new Map<string, FakeAudio>());

vi.mock('./index.js', () => ({
  MATCH_START: 'start',
  MATCH_TRANSITION: 'transition',
  MATCH_TELE: 'tele',
  MATCH_ENDGAME: 'endgame',
  MATCH_END: 'end',
  MATCH_ABORT: 'abort',
  initAudio: (name: string) => {
    const audio: FakeAudio = {
      currentTime: 0,
      play: vi.fn(() => Promise.resolve())
    };
    sounds.set(name, audio);
    return audio;
  }
}));

import { TIMER_CUE_EVENTS, playTimerCue } from './timer-cues.js';

const message = (
  event: TimerEventName | undefined,
  payload: TimerMessage['payload']
): TimerMessage => ({
  __timer: true,
  event,
  payload,
  timeLeft: 0,
  mode: 0,
  inProgress: false
});

describe('playTimerCue', () => {
  beforeEach(() => {
    sounds.forEach((sound) => {
      sound.currentTime = 0;
      sound.play.mockImplementation(() => Promise.resolve());
    });
  });

  it.each([
    ['timer:start', 'start'],
    ['timer:transition', 'transition'],
    ['timer:tele', 'tele'],
    ['timer:endgame', 'endgame'],
    ['timer:end', 'end'],
    ['timer:abort', 'abort']
  ] as const)('plays the %s sound', (event, sound) => {
    playTimerCue(message(event, { allowAudio: true }));
    expect(sounds.get(sound)?.play).toHaveBeenCalledTimes(1);
  });

  it('restarts a sound that is still playing', () => {
    const end = sounds.get('end')!;
    end.currentTime = 2.5;
    playTimerCue(message('timer:end', { allowAudio: true }));
    expect(end.currentTime).toBe(0);
  });

  it.each([
    ['audio is denied', { allowAudio: false }],
    ['there is no payload', undefined]
  ])('stays silent when %s', (_label, payload) => {
    playTimerCue(message('timer:end', payload));
    sounds.forEach((sound) => expect(sound.play).not.toHaveBeenCalled());
  });

  it('stays silent for events without a sound', () => {
    playTimerCue(message('timer:tick', { allowAudio: true }));
    playTimerCue(message('timer:auto', { allowAudio: true }));
    playTimerCue(message('timer:abort', { allowAudio: true }));
    playTimerCue(message(undefined, { allowAudio: true }));
    sounds.forEach((sound) => expect(sound.play).not.toHaveBeenCalled());
  });

  it('survives playback being blocked by the browser', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    sounds.get('start')!.play.mockRejectedValueOnce(new Error('blocked'));

    expect(() =>
      playTimerCue(message('timer:start', { allowAudio: true }))
    ).not.toThrow();
    await Promise.resolve();

    expect(warn).toHaveBeenCalled();
  });

  it('lists the events that have a sound', () => {
    expect(TIMER_CUE_EVENTS.sort()).toEqual([
      'timer:end',
      'timer:endgame',
      'timer:start',
      'timer:tele',
      'timer:transition'
    ]);
  });
});
