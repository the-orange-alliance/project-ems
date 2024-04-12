import {
  Match,
  MatchState,
  MatchTimer,
  Ranking,
  Team,
  Tournament
} from '@toa-lib/models';
import { atom, atomFamily } from 'recoil';

export const teamsByEventKeyAtomFam = atomFamily<Team[], string>({
  key: 'eventState.teamsByEventKeyAtomFam',
  default: []
});

export const tournamentsByEventKeyAtomFam = atomFamily<Tournament[], string>({
  key: 'eventState.tournamentsByEventKeyAtomFam',
  default: []
});

export const matchesByEventKeyAtomFam = atomFamily<Match<any>[], string>({
  key: 'eventState.matchesByEventKeyAtomFam',
  default: []
});

export const currentMatchIdAtom = atom<number | null>({
  key: 'eventState.currentMatchIdAtom',
  default: null
});

export const matchOccurringAtom = atom<Match<any> | null>({
  key: 'eventState.matchOccurringAtom',
  default: null
});

export const matchOccurringRanksAtom = atom<Ranking[] | null>({
  key: 'eventState.matchOccurringRanksAtom',
  default: null
});

export const matchStateAtom = atom<MatchState>({
  key: 'eventState.matchStateAtom',
  default: MatchState.MATCH_NOT_SELECTED
});

export const timer: MatchTimer = new MatchTimer();

export const matchStatusAtom = atom<string>({
  key: 'eventState.matchStatusAtom',
  default: 'NO MATCH SELECTED'
});

export const matchTimeAtom = atom({
  key: 'eventState.matchTimeAtom',
  default: timer.timeLeft
});

export const matchTimeModeAtom = atom({
  key: 'eventState.matchTimeModeAtom',
  default: timer.modeTimeLeft
});
