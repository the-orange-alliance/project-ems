import { z } from 'zod';
import { isArray, isNonNullObject, isNumber, isString } from '../types.js';

export const tournamentZod = z.object({
  eventKey: z.string(),
  tournamentKey: z.string(),
  tournamentLevel: z.number()
});

export interface Tournament {
  eventKey: string;
  tournamentKey: string;
  tournamentLevel: number;
  fieldCount: number;
  fields: string[];
  name: string;
}

export const defaultTournament: Tournament = {
  eventKey: '',
  tournamentKey: '',
  tournamentLevel: 0,
  fieldCount: 1,
  fields: ['Field 1'],
  name: ''
};

export const toTournamentJSON = (
  tournament: Tournament
): Record<string, unknown> => {
  return { ...tournament, fields: JSON.stringify(tournament.fields) };
};

export const fromTournamentJSON = (
  obj: Record<string, string | number>
): Tournament => {
  const tournament = { ...obj, fields: JSON.parse(obj.fields.toString()) };
  if (!isTournament(tournament))
    throw Error('Error while parsing JSON as Tournament object');
  return tournament;
};

export const isTournament = (obj: unknown): obj is Tournament =>
  isNonNullObject(obj) &&
  isString(obj.eventKey) &&
  isString(obj.tournamentKey) &&
  isArray(obj.fields) &&
  isNumber(obj.tournamentLevel);

export const isTournamentArray = (obj: unknown): obj is Tournament[] =>
  isArray(obj) && obj.every((o) => isTournament(o));
