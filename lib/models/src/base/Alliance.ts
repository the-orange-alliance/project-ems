import { z } from 'zod';

export const allianceMemberZod = z.object({
  eventKey: z.string(),
  tournamentKey: z.string(),
  allianceRank: z.number(),
  teamKey: z.number(),
  allianceNameLong: z.string(),
  allianceNameShort: z.string(),
  isCaptain: z.number(),
  pickOrder: z.number()
});

export const defaultAllianceMember: AllianceMember = {
  eventKey: '',
  tournamentKey: '',
  allianceRank: -1,
  teamKey: -1,
  allianceNameLong: '',
  allianceNameShort: '',
  isCaptain: 0,
  pickOrder: -1
};

export type AllianceMember = z.infer<typeof allianceMemberZod>;
