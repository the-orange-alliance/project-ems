import { isArray, isNonNullObject, isNumber, isString } from './types.js';

export interface AllianceMember {
  allianceKey: string;
  allianceRank: number;
  teamKey: number;
  tournamentLevel: number;
  allianceNameLong: string;
  allianceNameShort: string;
  isCaptain: boolean;
  pickOrder: number;
}

export const defaultAllianceMember: AllianceMember = {
  allianceKey: '',
  allianceRank: -1,
  teamKey: -1,
  tournamentLevel: -1,
  allianceNameLong: '',
  allianceNameShort: '',
  isCaptain: false,
  pickOrder: -1
};

export const isAllianceMember = (obj: unknown): obj is AllianceMember =>
  isNonNullObject(obj) &&
  isString(obj.allianceKey) &&
  isNumber(obj.allianceRank) &&
  isNumber(obj.teamKey);

export const isAllianceArray = (obj: unknown): obj is AllianceMember[] =>
  isArray(obj) && obj.every((o) => isAllianceMember(o));
