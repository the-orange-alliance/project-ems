import { isArray, isNonNullObject, isNumber, isString } from './types.js';

export interface AllianceMember {
  eventKey: string;
  tournamentKey: string;
  allianceRank: number;
  teamKey: number;
  allianceNameLong: string;
  allianceNameShort: string;
  isCaptain: boolean;
  pickOrder: number;
}

export const defaultAllianceMember: AllianceMember = {
  eventKey: '',
  tournamentKey: '',
  allianceRank: -1,
  teamKey: -1,
  allianceNameLong: '',
  allianceNameShort: '',
  isCaptain: false,
  pickOrder: -1
};

export const isAllianceMember = (obj: unknown): obj is AllianceMember =>
  isNonNullObject(obj) &&
  isString(obj.eventKey) &&
  isString(obj.tournamentKey) &&
  isNumber(obj.allianceRank) &&
  isNumber(obj.teamKey);

export const isAllianceArray = (obj: unknown): obj is AllianceMember[] =>
  isArray(obj) && obj.every((o) => isAllianceMember(o));
