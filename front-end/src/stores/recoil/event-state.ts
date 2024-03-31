import { Match, Team, Tournament } from '@toa-lib/models';
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
