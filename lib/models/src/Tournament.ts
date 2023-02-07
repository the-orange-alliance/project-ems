import { isArray, isNonNullObject, isNumber, isString } from './types.js';

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
  tournamentLevel: -1,
  fieldCount: 1,
  fields: ['Field 1'],
  name: ''
};

export const isTournament = (obj: unknown): obj is Tournament =>
  isNonNullObject(obj) &&
  isString(obj.eventKey) &&
  isString(obj.tournamentKey) &&
  isNumber(obj.tournamentLevel);

export const isTournamentArray = (obj: unknown): obj is Tournament[] =>
  isArray(obj) && obj.every((o) => isTournament(o));
