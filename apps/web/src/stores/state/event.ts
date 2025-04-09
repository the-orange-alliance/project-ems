import { Event, Team, Tournament } from '@toa-lib/models';
import { atom } from 'jotai';

/**
 * @section EVENT STATE - currently selected keys
 */
export const eventKeyAtom = atom<string | null>(null);
export const teamKeyAtom = atom<string | null>(null);
export const tournamentKeyAtom = atom<string | null>(null);
export const matchIdAtom = atom<number | null>(null);
// Event data atoms
export const eventAtom = atom<Event | null>(null);
export const teamsAtom = atom<Team[]>([]);
export const tournamentsAtom = atom<Tournament[]>([]);

/**
 * @section MODIFIED STATE - modified state for unsaved changes
 */
export const modifiedEventAtom = atom<Event | null>(null);
export const modifiedTeamsAtom = atom<Team[]>([]);
export const modifiedTournamentsAtom = atom<Tournament[]>([]);
