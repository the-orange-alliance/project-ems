import { isArray, isNonNullObject, isNumber, isString } from './types';

export interface Team {
  teamKey: number;
  eventParticipantKey: string;
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
  teamKey: 0,
  eventParticipantKey: '',
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

export const isTeam = (obj: unknown): obj is Team =>
  isNonNullObject(obj) &&
  isNumber(obj.teamKey) &&
  isString(obj.eventParticipantKey);

export const isTeamArray = (obj: unknown): obj is Team[] =>
  isArray(obj) && obj.every((o) => isTeam(o));
