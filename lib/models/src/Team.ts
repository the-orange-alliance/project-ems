import { isArray, isNonNullObject, isString } from './types';

export interface Team {
  teamKey: string;
  eventParticipantKey: string;
  hasCard: boolean;
  teamNameShort: string;
  teamNameLong: string;
  robotName: string;
  city: string;
  stateProv: string;
  country: string;
  countryCode: string;
  rookieYear: string;
  cardStatus: number;
}

export const defaultTeam: Team = {
  teamKey: '',
  eventParticipantKey: '',
  hasCard: false,
  teamNameShort: '',
  teamNameLong: '',
  robotName: '',
  city: '',
  stateProv: '',
  country: '',
  countryCode: '',
  rookieYear: '',
  cardStatus: 0
};

export const isTeam = (obj: unknown): obj is Team =>
  isNonNullObject(obj) &&
  isString(obj.teamKey) &&
  isString(obj.eventParticipantKey);

export const isTeamArray = (obj: unknown): obj is Team[] =>
  isArray(obj) && obj.every((o) => isTeam(o));
