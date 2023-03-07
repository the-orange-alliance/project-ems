import { isNonNullObject, isString, isNumber, isArray } from '../types.js';

export interface FMSSettings {
  eventKey: string;
  fieldNumber: number;
  hwFingerprint: string;
  enableFms: boolean;
  enableAdvNet: boolean;
  apIp: string;
  apUsername: string;
  apPassword: string;
  apTeamCh: string;
  apAdminCh: string;
  apAdminSsid: string;
  apAdminWpa: string;
  switchIp: string;
  switchUsername: string;
  switchPassword: string;
  enablePlc: boolean;
  plcIp: string;
  registeredAt: string;
}

export const getDefaultFMSSettings = (hwKey: string): FMSSettings => ({
  eventKey: "",
  fieldNumber: -1,
  hwFingerprint: hwKey,
  enableFms: true,
  enableAdvNet: true,
  apIp: "10.0.100.3",
  apUsername: "root",
  apPassword: "1234Five",
  apTeamCh: "157",
  apAdminCh: "-1",
  apAdminSsid: "EMS",
  apAdminWpa: "1234Five",
  switchIp: "10.0.100.2",
  switchUsername: "cisco",
  switchPassword: "1234Five",
  enablePlc: true,
  plcIp: "10.0.100.40",
  registeredAt: new Date().toISOString(),
})

// Avaliable 5Ghz channels
export const TeamChannels = [
  "36",
  "40",
  "44",
  "48",
  "149",
  "153",
  "157",
  "161",
]


// Avaliable 2.4Ghz channels
export const AdminChannels = [
  "0", // Disabled
  "1",
  "6",
  "11",
]

export const isFMSSettings = (obj: unknown): obj is FMSSettings =>
  isNonNullObject(obj) &&
  isString(obj.eventKey) &&
  isNumber(obj.fieldNumber) &&
  isString(obj.hwFingerprint) &&
  isNumber(obj.enableFms) &&
  isNumber(obj.enableAdvNet) &&
  isString(obj.apIp) &&
  isString(obj.apUsername) &&
  isString(obj.apPassword) &&
  isString(obj.apTeamCh) &&
  isString(obj.apAdminCh) &&
  isString(obj.apAdminSsid) &&
  isString(obj.apAdminWpa) &&
  isString(obj.switchIp) &&
  isString(obj.switchUsername) &&
  isString(obj.switchPassword) &&
  isNumber(obj.enablePlc) &&
  isString(obj.plcIp) &&
  isString(obj.registeredAt);

export const isFMSSettingsArray = (obj: unknown): obj is FMSSettings[] =>
  isArray(obj) && obj.every((o) => isFMSSettings(o));