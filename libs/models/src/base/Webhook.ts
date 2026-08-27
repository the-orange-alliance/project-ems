import { z } from 'zod';
import { matchZod } from './Match.js';

/**
 * Events a webhook can be subscribed to. Every payload is `{ payload: Match }`.
 *
 * The first group is emitted directly. The `SCORES_POSTED_*` variants are
 * **subscription-side filters**, not separate emits: only `SCORES_POSTED` is
 * ever emitted, and `EmitWebhooks` decides the winner and delivers to whichever
 * of the coloured subscriptions matches. Subscribing to `SCORES_POSTED` itself
 * receives every posted result regardless of outcome.
 *
 * `PRODUCTION_ACTIVE`, `FORCE_LIGHTS_MATCH`, and `FORCE_LIGHTS_STANDBY` are the
 * production/broadcast control group (issue #262): manual or field-linking
 * driven signals for switching what a broadcast is showing, still carrying the
 * current match as payload like everything else here.
 */
export enum WebhookEvent {
  PRESTARTED = 'PRESTARTED',
  PRESTART_ABORTED = 'PRESTART_ABORTED',
  DISPLAYS_SET = 'DISPLAYS_SET',
  FIELD_PREPPED = 'FIELD_PREPPED',
  MATCH_STARTED = 'MATCH_STARTED',
  MATCH_ENDGAME = 'MATCH_ENDGAME',
  MATCH_ENDED = 'MATCH_ENDED',
  ALL_CLEAR = 'ALL_CLEAR',
  COMMITTED = 'COMMITTED',
  SCORES_POSTED = 'SCORES_POSTED',

  // Filters on SCORES_POSTED — see above. Never emitted on their own.
  SCORES_POSTED_RED = 'SCORES_POSTED_RED',
  SCORES_POSTED_BLUE = 'SCORES_POSTED_BLUE',
  SCORES_POSTED_TIED = 'SCORES_POSTED_TIED',

  // Production/broadcast control — see doc comment above.
  PRODUCTION_ACTIVE = 'PRODUCTION_ACTIVE',
  FORCE_LIGHTS_MATCH = 'FORCE_LIGHTS_MATCH',
  FORCE_LIGHTS_STANDBY = 'FORCE_LIGHTS_STANDBY'
};

export const SendWebhookSchema = z.object({
  event: z.nativeEnum(WebhookEvent),
  payload: z.union([matchZod, z.any()])
});

export const WebhookDbSchema = z.object({
  id: z.number().int().optional(), // AUTOINCREMENT primary key
  url: z.string().min(1),
  // store enabled as 0 or 1 in SQLite
  enabled: z.union([z.literal(0), z.literal(1), z.boolean()]),
  subscribedEvent: z.nativeEnum(WebhookEvent),
  note: z.string().nullable().optional(),
  lastErrorMessage: z.string().nullable().optional(),
  lastErrorTime: z.string().nullable().optional(),
  errorCount: z.number().int().optional(),
  field: z.number().nullable().optional()
});

export type WebhookDb = z.infer<typeof WebhookDbSchema>;

// Application-friendly schema: enabled as boolean
export const WebhookSchema = WebhookDbSchema.transform((db) => ({
  ...db,
  enabled: db.enabled === 1 || db.enabled === true
}));

export type Webhook = z.infer<typeof WebhookSchema>;

// Helper to convert app model back to DB representation
export function toDbWebhook(input: Webhook): WebhookDb {
  return {
    ...input,
    enabled: input.enabled ? 1 : 0
  } as WebhookDb;
}
