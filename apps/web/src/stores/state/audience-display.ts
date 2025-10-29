import { Displays } from '@toa-lib/models';
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const displayIdAtom = atom<Displays>(Displays.SPONSOR);
export const displayChromaKeyAtom = atomWithStorage<string>(
  '#ff00ff00',
  'audienceChroma'
);
