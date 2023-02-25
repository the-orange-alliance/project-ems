import { DateTime } from 'luxon';
import { isArray, isNonNullObject, isString } from './types.js';

export interface EventType {
  key: string;
  name: string;
}

export const EventTypes: EventType[] = [
  {
    key: 'qual',
    name: 'Qualifier'
  },
  {
    key: 'league_meet',
    name: 'League Meet'
  },
  {
    key: 'region_cmp',
    name: 'Regional Championship'
  },
  {
    key: 'region_super',
    name: 'Super Regional'
  },
  {
    key: 'cmp',
    name: 'Championship'
  },
  {
    key: 'off',
    name: 'Offseason'
  }
];

export interface Event {
  eventKey: string;
  seasonKey: string;
  regionKey: string;
  eventTypeKey: string;
  eventName: string;
  divisionName: string;
  venue: string;
  city: string;
  stateProv: string;
  startDate: string;
  endDate: string;
  country: string;
  website: string;
}

export const defaultEvent: Event = {
  eventKey: '',
  seasonKey: '',
  regionKey: '',
  eventTypeKey: '',
  eventName: '',
  divisionName: '',
  venue: '',
  city: '',
  stateProv: '',
  startDate: DateTime.now().toISO(),
  endDate: DateTime.now().plus({ days: 1 }).toISO(),
  country: '',
  website: ''
};

export const isEvent = (obj: unknown): obj is Event =>
  isNonNullObject(obj) &&
  isString(obj.eventKey) &&
  isString(obj.seasonKey) &&
  isString(obj.regionKey) &&
  isString(obj.eventTypeKey) &&
  isString(obj.eventName);

export const isEventArray = (obj: unknown): obj is Event[] =>
  isArray(obj) && obj.every((o) => isEvent(o));
