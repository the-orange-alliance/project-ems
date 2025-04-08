import { Event, Team, Tournament } from '@toa-lib/models';
import { atom } from 'jotai';

/**
 * @section EVENT STATE - currently selected keys
 */
export const eventKeyAtom = atom<string | null>(null);
export const teamKeyAtom = atom<string | null>(null);
export const tournamentKeyAtom = atom<string | null>(null);
export const matchIdAtom = atom<number | null>(null);

/**
 * @section TEAM STATE - registered teams for an event
 */
export const eventAtom = atom<Event | null>(null);
export const teamsAtom = atom<Team[]>([]);
export const tournamentsAtom = atom<Tournament[]>([]);
