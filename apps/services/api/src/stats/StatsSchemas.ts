import { z } from 'zod';
import {
  querySchema,
  jsonSchema,
  resultSchema,
  tournamentTypes
} from '@toa-lib/models/seasons/stats';
export const eventParams = z.object({
  eventKey: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/)
});
/** Mirrors `StatDependency` in `@toa-lib/models/seasons/stats/types.ts` - a TS-only union, so its members are re-listed here as a runtime enum for the Swagger schema. */
const statDependency = z.enum([
  'matches',
  'details',
  'participants',
  'teams',
  'rankings',
  'alliances',
  'actions',
  'history',
  'settings'
]);
/** Mirrors `keyof StatsQuery['selectors']` (`selectorsSchema` in `types.ts`). */
const statSelector = z.enum([
  'teamKey',
  'matchId',
  'allianceSeed',
  'teamsInMatchId',
  'teamKeyList'
]);
/**
 * Documents the shape `catalogueMetadata()` (`registry.ts`) actually returns
 * for `GET /stats/:eventKey/catalogue` - one entry per available calculator,
 * explaining what it computes and how to call it - so Swagger renders a real
 * model instead of an opaque `z.array(jsonSchema)` blob.
 */
export const catalogueEntrySchema = z
  .object({
    slug: z
      .string()
      .describe(
        'The `stat` value to pass to POST /:eventKey/query to run this calculator.'
      ),
    catalogueId: z
      .string()
      .describe(
        'Stable short id (e.g. "A1") referencing this stat in design docs.'
      ),
    name: z.string().describe('Human-readable stat name.'),
    description: z
      .string()
      .describe('What this stat measures and how it is derived.'),
    seasonKey: z
      .string()
      .optional()
      .describe(
        'Present only for season-specific calculators; absent means generic/cross-season.'
      ),
    version: z
      .number()
      .int()
      .describe(
        'Calculator version. A bump invalidates previously cached results for this stat.'
      ),
    scope: z
      .enum(['event', 'team', 'match', 'alliance'])
      .describe('What one result row describes.'),
    family: z
      .enum(['EMS', 'DER', 'REF'])
      .describe(
        'EMS = sourced directly from the event system; DER = derived/modeled; REF = referee-entered.'
      ),
    units: z
      .string()
      .describe(
        'Unit of the result value(s), e.g. "points", "seconds", "ratio".'
      ),
    precision: z
      .number()
      .int()
      .describe('Suggested decimal places for display.'),
    defaultTournamentTypes: z
      .array(z.enum(tournamentTypes))
      .optional()
      .describe(
        'Tournament types applied when a query does not specify `filters.tournamentTypes`.'
      ),
    allowedTournamentTypes: z
      .array(z.enum(tournamentTypes))
      .optional()
      .describe(
        'If set, `filters.tournamentTypes` may only contain these values.'
      ),
    dependencies: z
      .array(statDependency)
      .describe(
        'Source data this calculator reads; e.g. "actions"/"history" mean it needs captured match audit data, not just final scores.'
      ),
    qualityNotes: z
      .array(z.string())
      .describe('Caveats about result reliability or provenance.'),
    supportedSelectors: z
      .array(statSelector)
      .describe(
        'Which `selectors` fields this stat accepts in its query (see POST /:eventKey/query).'
      ),
    supportedFilters: z
      .array(z.enum(['tournamentKeys', 'tournamentTypes', 'tournamentLevels']))
      .describe('Which `filters` fields this stat accepts.'),
    paramsSchema: z
      .record(z.string(), jsonSchema)
      .describe(
        "JSON Schema for this stat's `params` object in the query body."
      ),
    resultSchema: z
      .record(z.string(), jsonSchema)
      .describe('JSON Schema for the `result.data` shape this stat returns.')
  })
  .describe('One available statistic and everything needed to query it.');
export const catalogueSchema = z
  .array(catalogueEntrySchema)
  .describe("Every statistic available for this event's season.");
export const queryBody = querySchema
  .omit({ eventKey: true })
  .extend({ refresh: z.boolean().default(false) });
export const markerSchema = z.object({
  latestMatchUpdatedAtUtc: z.string().nullable(),
  latestHistoryId: z.number().nullable(),
  latestActionEventId: z.number().nullable()
});
export const latestMatchSchema = z.object({
  eventKey: z.string(),
  tournamentKey: z.string(),
  id: z.number(),
  name: z.string(),
  actualStartTime: z.string(),
  updatedAtUtc: z.string().nullable()
});
export const workerResultSchema = z
  .object({
    result: resultSchema,
    calculatorVersion: z.number().int().positive(),
    computeMs: z.number().nonnegative(),
    calculatedAsOfUtc: z.iso.datetime(),
    latestPlayedMatch: latestMatchSchema.nullable(),
    sourceMarker: markerSchema,
    selectedTournamentKeys: z.array(z.string())
  })
  .strict();
export type WorkerResult = z.infer<typeof workerResultSchema>;
export const queueJobSchema = z.object({
  jobId: z.uuid(),
  origin: z.enum([
    'cold-miss',
    'stale-refresh',
    'explicit-refresh',
    'controller'
  ]),
  state: z.enum(['queued', 'running']),
  position: z.number().int().nullable(),
  eventKey: z.string(),
  stat: z.string(),
  queryHash: z.string(),
  enqueuedAtUtc: z.iso.datetime(),
  startedAtUtc: z.iso.datetime().optional(),
  waitingRequestCount: z.number().int().nonnegative()
});
export const queueSchema = z.object({
  queueVersion: z.number().int().nonnegative(),
  capacity: z.number().int().nonnegative(),
  workerCount: z.number().int().positive(),
  running: z.array(queueJobSchema),
  queued: z.array(queueJobSchema)
});
export const reorderSchema = z
  .object({
    expectedQueueVersion: z.number().int().nonnegative(),
    orderedJobIds: z.array(z.uuid()).max(10000)
  })
  .strict();
export const responseSchema = workerResultSchema.extend({
  normalizedQuery: querySchema,
  cache: z.enum(['fresh', 'stale', 'miss']),
  refreshQueued: z.boolean(),
  waitedForWorker: z.boolean(),
  cacheAgeMs: z.number().nonnegative()
});
export const errorSchema = z.object({
  error: z.string(),
  message: z.string(),
  queue: queueSchema.optional()
});
