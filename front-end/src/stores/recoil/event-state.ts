import { Match, Team, Tournament } from '@toa-lib/models';
import { atomFamily } from 'recoil';

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
