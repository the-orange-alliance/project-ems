import { isNonNullObject, isString } from './types';

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
  state_prov: string;
  start_date: string;
  end_date: string;
  country: string;
  website: string;
  field_count: number;
}

export const isEvent = (obj: unknown): obj is Event =>
  isNonNullObject(obj) &&
  isString(obj.eventKey) &&
  isString(obj.seasonKey) &&
  isString(obj.regionKey) &&
  isString(obj.eventType) &&
  isString(obj.eventName);
