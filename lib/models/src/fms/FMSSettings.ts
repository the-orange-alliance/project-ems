import { isNonNullObject, isString, isBoolean } from '../types.js';

export interface FMSSettings {
  eventKey: string;
  enableFms: boolean;
  enableAdvNet: boolean;
  apIp: string;
  apUsername: string;
  apPassword: string;
  apTeamCh: string;
  apAdminCh: string;
  apAdminWpa: string;
  switchIp: string;
  switchPassword: string;
  enablePlc: boolean;
  plcIp: string;
}

export const getDefaultFMSSettings = (): FMSSettings => ({
  eventKey: "",
  enableFms: true,
  enableAdvNet: true,
  apIp: "10.0.100.3",
  apUsername: "root",
  apPassword: "1234Five",
  apTeamCh: "157",
  apAdminCh: "-1",
  apAdminWpa: "1234Five",
  switchIp: "10.0.100.2",
  switchPassword: "1234Five",
  enablePlc: true,
  plcIp: "10.0.100.40"
})

export const isFMSSettings = (obj: unknown): obj is FMSSettings =>
  isNonNullObject(obj) &&
  isString(obj.eventKey) &&
  isBoolean(obj.enableFms) &&
  isBoolean(obj.enableAdvNet) &&
  isString(obj.apIp) &&
  isString(obj.apUsername) &&
  isString(obj.apPassword) &&
  isString(obj.apTeamCh) &&
  isString(obj.apAdminWpa) &&
  isString(obj.apIp) &&
  isString(obj.switchIp) &&
  isBoolean(obj.enablePlc) &&
  isString(obj.plcIp);