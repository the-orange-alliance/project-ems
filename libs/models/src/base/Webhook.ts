import { z } from 'zod';
import { matchZod } from './Match.js';

export enum WebhookEvent {
  PRESTARTED = 'PRESTARTED', // { payload: Match }
  PRESTART_ABORTED = 'PRESTART_ABORTED', // { payload: Match }
  DISPLAYS_SET = 'DISPLAYS_SET', // { payload: Match }
  FIELD_PREPPED = 'FIELD_PREPPED', // { payload: Match }
  MATCH_STARTED = 'MATCH_STARTED', // { payload: Match }
  ALL_CLEAR = 'ALL_CLEAR', // { payload: Match }
  COMMITTED = 'COMMITTED', // { payload: Match }
  SCORES_POSTED = 'SCORES_POSTED' // { payload: Match }
}

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
