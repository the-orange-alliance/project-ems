import { isNonNullObject, isString } from './types.js';

export interface Event {
  eventKey: string;
  seasonKey: string;
  regionKey: string;
  eventType: string;
  eventName: string;
  divisionName: string;
  venue: string;
  eventTypeKey: string;
  city: string;
  stateProv: string;
  startDate: string;
  endDate: string;
  country: string;
  website: string;
  fieldCount: number;
}

export const defaultEvent: Event = {
  eventKey: '',
  seasonKey: '',
  regionKey: '',
  eventType: '',
  eventName: '',
  divisionName: '',
  venue: '',
  eventTypeKey: '',
  city: '',
  stateProv: '',
  startDate: '',
  endDate: '',
  country: '',
  website: '',
  fieldCount: 2
};

export const isEvent = (obj: unknown): obj is Event =>
  isNonNullObject(obj) &&
  isString(obj.eventKey) &&
  isString(obj.seasonKey) &&
  isString(obj.regionKey) &&
  isString(obj.eventType) &&
  isString(obj.eventName);
