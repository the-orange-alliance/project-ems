import { Displays } from '@toa-lib/models';
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

export const displayIdAtom = atom<Displays>(Displays.SPONSOR);
// True while ChromaLayout is mounted; suppresses the global themed html/body styles.
export const chromaLayoutActiveAtom = atom(false);
export const displayChromaKeyAtom = atomWithStorage<string>(
  '#ff00ff00',
  'audienceChroma'
);
