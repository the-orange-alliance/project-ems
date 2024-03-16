import { z } from 'zod';

export const tournamentDatabaseZod = z.object({
  eventKey: z.string(),
  tournamentKey: z.string(),
  tournamentLevel: z.number(),
  fieldCount: z.number(),
  fields: z.string(),
  name: z.string()
});

export const tournamentZod = tournamentDatabaseZod.transform((data) => {
  return {
    ...data,
    fields: JSON.parse(data.fields)
  };
});

export const defaultTournament: Tournament = {
  eventKey: '',
  tournamentKey: '',
  tournamentLevel: 0,
  fieldCount: 1,
  fields: ['Field 1'],
  name: ''
};

export const toTournamentJSON = (
  tournament: Tournament
): Record<string, unknown> => {
  return { ...tournament, fields: JSON.stringify(tournament.fields) };
};

export type Tournament = z.infer<typeof tournamentZod>;
