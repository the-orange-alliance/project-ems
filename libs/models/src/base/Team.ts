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
  /**
   * The card this team is *carrying* for the event, as a {@link CardStatus}.
   *
   * Distinct from `MatchParticipant.cardStatus`, which is the card issued in
   * one specific match and clears at the next prestart. This one persists once
   * a yellow is issued, and exists so the audience display can show that a team
   * is carrying a card. It is advisory only: it never feeds scoring, rankings,
   * or referee screens, and a second yellow does not escalate it to a red.
   */
  cardStatus: z.number(),
  /** Convenience mirror of `cardStatus !== CardStatus.NO_CARD`. Always written together with it. */
  hasCard: z.coerce.boolean(),
  /**
   * Which {@link CardCarryPhase} the carried card belongs to, or `null` when
   * there is no carried card. Cards do not cross the qualification/playoff
   * boundary, so a card is only in force while this matches the phase of the
   * tournament being played — `GET /match/all` blanks it otherwise.
   */
  cardPhase: z.string().nullable().optional()
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
  hasCard: 'Has Card',
  cardPhase: 'Card Phase'
};

export type Team = z.infer<typeof teamZod>;
type TeamKey = keyof Team;
