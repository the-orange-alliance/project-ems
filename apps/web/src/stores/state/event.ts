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

// This atom acts as a getter/setter for the currently selected match.  If the match
// gets updated, the atom will automatically update the matches array
// look, bad any practices! but this whole thing is so f'd up I'll <any> away
export const matchAtom = atom<Match<any> | null, any[], any>(
  (get) => {
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
  },
  (get, set, newMatch: Match<any> | null) => {
    if (newMatch) {
      set(matchIdAtom, newMatch.id);
      set(eventKeyAtom, newMatch.eventKey);
      set(tournamentKeyAtom, newMatch.tournamentKey);

      // Get the matches array
      const matches = [...get(matchesAtom)];
      // Find the index of the match to update
      const index = matches.findIndex(
        (m) =>
          m.eventKey === newMatch.eventKey &&
          m.tournamentKey === newMatch.tournamentKey &&
          m.id === newMatch.id
      );

      // If the match exists, update it
      if (index >= 0) {
        matches[index] = newMatch;
        set(matchesAtom, matches);
      }

      // finally, the end of this inefficient madness
      // someone please rewrite this I beg you
    } else {
      set(matchIdAtom, null);
      set(eventKeyAtom, null);
      set(tournamentKeyAtom, null);
    }
  }
);

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
