import { Displays } from '@toa-lib/models';
import { atom } from 'jotai';

export const displayIdAtom = atom<Displays>(Displays.SPONSOR);
export const displayChromaKeyAtom = atom<string>('#ff00ff00');
