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

export const currentEventKeyAtom = atom<string>({
  key: 'eventState.currentEventKeySelector',
  default: ''
});

export const currentTeamKeyAtom = atom<number | null>({
  key: 'eventState.currentTeamKeyAtom',
  default: null
});

export const currentTournamentKeyAtom = atom<string | null>({
  key: 'currentTournamentKeyAtom',
  default: null
});

export const activeFieldsAtom = atom<string[]>({
  key: 'eventState.activeFieldsAtom',
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

// this "freezes" the match occuring atom when the display is set to results so it doesn't update anymore
export const matchResultsMatchAtom = atom<Match<any> | null>({
  key: 'eventState.matchResultsMatchAtom',
  default: null
});
export const matchResultsRanksAtom = atom<Ranking[] | null>({
  key: 'eventState.matchResultsRanksAtom',
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

export const redBonusActiveAtom = atom({
  key: 'redBonusActiveAtom',
  default: false
});

export const blueBonusActiveAtom = atom({
  key: 'blueBonusActiveAtom',
  default: false
});

export const socketConnectedAtom = atom<boolean>({
  key: 'socketConnectedAtom',
  default: false
});
