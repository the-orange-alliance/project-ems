import { z } from 'zod';
import { tournamentTypeZod } from './Schedule.js';

export const tournamentZod = z.object({
  eventKey: z.string(),
  tournamentKey: z.string(),
  tournamentLevel: z.number(),
  tournamentType: tournamentTypeZod,
  fieldCount: z.number(),
  fields: z.array(z.string()),
  name: z.string()
});

export const toDatabaseZod = tournamentZod.transform((data) => ({
  ...data,
  fields: data.fields.toString()
}));

export const tournamentDatabaseZod = z
  .object({
    eventKey: z.string(),
    tournamentKey: z.string(),
    tournamentLevel: z.number(),
    tournamentType: tournamentTypeZod,
    fieldCount: z.number(),
    fields: z.string(),
    name: z.string()
  })
  .transform((data) => ({
    ...data,
    fields: data.fields.toString().split(',')
  }));

export const defaultTournament: Tournament = {
  eventKey: '',
  tournamentKey: '',
  tournamentLevel: 0,
  tournamentType: 'Test',
  fieldCount: 1,
  fields: ['Field 1'],
  name: ''
};

export const fromDatabaseJSON = (
  tournament: Tournament
): Record<string, unknown> => {
  return { ...tournament, fields: Array.from(tournament.fields) };
};

export type Tournament = z.infer<typeof tournamentZod>;
