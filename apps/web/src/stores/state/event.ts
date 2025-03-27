import { atom } from 'jotai';

/**
 * @section EVENT STATE - currently selected keys
 */
export const eventKeyAtom = atom<string | null>(null);
export const teamKeyAtom = atom<string | null>(null);
export const tournamentKeyAtom = atom<string | null>(null);
export const matchIdAtom = atom<number | null>(null);
