import { DateTime } from 'luxon';
import { z } from 'zod';

export const eventTypeZod = z.object({
  key: z.string(),
  name: z.string()
});

export const eventZod = z.object({
  eventKey: z.string(),
  seasonKey: z.string(),
  regionKey: z.string(),
  eventTypeKey: z.string(),
  eventName: z.string(),
  divisionName: z.string(),
  venue: z.string(),
  city: z.string(),
  stateProv: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  country: z.string(),
  website: z.string()
});

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
  startDate: DateTime.now().toISO() ?? '',
  endDate: DateTime.now().plus({ days: 1 }).toISO() ?? '',
  country: '',
  website: ''
};

export type EventType = z.infer<typeof eventTypeZod>;
export type Event = z.infer<typeof eventZod>;
