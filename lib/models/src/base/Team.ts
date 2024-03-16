import { z } from 'zod';

export const teamZod = z.object({
  eventKey: z.string(),
  teamKey: z.number(),
  hasCard: z.coerce.boolean(),
  teamNameShort: z.string(),
  teamNameLong: z.string(),
  robotName: z.string(),
  city: z.string(),
  stateProv: z.string(),
  country: z.string(),
  countryCode: z.string().max(2),
  rookieYear: z.number(),
  cardStatus: z.number()
});

export const defaultTeam: Team = {
  eventKey: '',
  teamKey: 0,
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

export const TeamKeys: TeamKey[] = [
  'city',
  'country',
  'countryCode',
  'robotName',
  'stateProv',
  'teamKey',
  'teamNameLong',
  'teamNameShort'
];

export type Team = z.infer<typeof teamZod>;
type TeamKey = keyof Team;
