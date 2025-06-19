import { MatchState, MatchTimer } from '@toa-lib/models';
import { atom } from 'jotai';

/**
 * @section EVENT STATE - currently selected keys
 */
export const matchStateAtom = atom<MatchState>(MatchState.MATCH_NOT_SELECTED);

export const timer: MatchTimer = new MatchTimer();

export const matchStatusAtom = atom<string>('NO MATCH SELECTED');

export const matchTimeAtom = atom(timer.timeLeft);

export const matchTimeModeAtom = atom(timer.modeTimeLeft);
