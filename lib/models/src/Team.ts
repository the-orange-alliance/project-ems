import { isArray, isNonNullObject, isNumber, isString } from './types.js';

export interface Team {
  eventKey: string;
  teamKey: number;
  hasCard: boolean;
  teamNameShort: string;
  teamNameLong: string;
  robotName: string;
  city: string;
  stateProv: string;
  country: string;
  countryCode: string;
  rookieYear: number;
  cardStatus: number;
}

export const defaultTeam: Team = {
  eventKey: '',
  teamKey: 0,
  hasCard: false,
  teamNameShort: '',
  teamNameLong: '',
  robotName: '',
  city: '',
  stateProv: '',
  country: '',
  countryCode: '',
  rookieYear: 2022,
  cardStatus: 0
};

type TeamKey = keyof Team;
export const TeamKeys: TeamKey[] = [
  'city',
  'country',
  'countryCode',
  'robotName',
  'stateProv',
  'teamKey',
  'teamNameLong',
  'teamNameShort'
];

export const isTeam = (obj: unknown): obj is Team =>
  isNonNullObject(obj) && isString(obj.eventKey) && isNumber(obj.teamKey);

export const isTeamArray = (obj: unknown): obj is Team[] =>
  isArray(obj) && obj.every((o) => isTeam(o));
