import {
  Event,
  ScheduleParams,
  ScheduleItem,
  Team,
  Tournament,
  Match
} from '@toa-lib/models';
import { atom } from 'jotai';

/**
 * @section EVENT STATE - currently selected keys
 */
export const eventKeyAtom = atom<string | null>(null);
export const teamKeyAtom = atom<string | null>(null);
export const tournamentKeyAtom = atom<string | null>(null);
export const matchIdAtom = atom<number | null>(null);
// This never has to be manually set, it is derived from the other atoms
export const matchAtom = atom<Match<any> | null>((get) => {
  const eventKey = get(eventKeyAtom);
  const tournamentKey = get(tournamentKeyAtom);
  const matchId = get(matchIdAtom);
  const matches = get(matchesAtom);
  return (
    matches.find(
      (m) =>
        m.eventKey === eventKey &&
        m.tournamentKey === tournamentKey &&
        m.id === matchId
    ) || null
  );
});
// Event data atoms
export const eventAtom = atom<Event | null>(null);
export const teamsAtom = atom<Team[]>([]);
export const tournamentsAtom = atom<Tournament[]>([]);
export const scheduleParamsAtom = atom<ScheduleParams[]>([]);
export const scheduleItemsAtom = atom<ScheduleItem[]>([]);
export const matchesAtom = atom<Match<any>[]>([]);

/**
 * @section MODIFIED STATE - modified state for unsaved changes
 */
export const modifiedEventAtom = atom<Event | null>(null);
export const modifiedTeamsAtom = atom<Team[]>([]);
export const modifiedTournamentsAtom = atom<Tournament[]>([]);
export const modifiedScheduleItemsAtom = atom<ScheduleItem[]>([]);
export const modifiedScheduleParamsAtom = atom<ScheduleParams[]>([]);
export const modifiedMatchesAtom = atom<Match<any>[]>([]);
