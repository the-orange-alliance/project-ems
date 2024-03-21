import { Team } from '@toa-lib/models';
import { atomFamily } from 'recoil';

export const teamsByEventKeyAtomFam = atomFamily<Team[], string>({
  key: 'eventState.teamsByEventKeyAtomFam',
  default: []
});
