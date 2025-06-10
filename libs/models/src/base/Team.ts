import { z } from 'zod';

export const teamZod = z.object({
  eventKey: z.string(),
  teamKey: z.number(),
  teamNumber: z.string(),
  teamNameShort: z.string(),
  teamNameLong: z.string(),
  robotName: z.string(),
  city: z.string(),
  stateProv: z.string(),
  country: z.string(),
  countryCode: z.string().max(2),
  rookieYear: z.number(),
  cardStatus: z.number(),
  hasCard: z.coerce.boolean()
});

export const defaultTeam: Team = {
  eventKey: '',
  teamKey: 0,
  teamNumber: '',
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

export const TeamKeysLables: Record<TeamKey, string> = {
  city: 'City',
  country: 'Country',
  countryCode: 'Country Code',
  robotName: 'Robot Name',
  stateProv: 'State/Province',
  teamKey: 'Team Key',
  teamNameLong: 'Team Name (Long)',
  teamNameShort: 'Team Name (Short)',
  eventKey: 'Event Key',
  teamNumber: 'Team Number',
  rookieYear: 'Rookie Year',
  cardStatus: 'Card Status',
  hasCard: 'Has Card'
};

export type Team = z.infer<typeof teamZod>;
type TeamKey = keyof Team;
