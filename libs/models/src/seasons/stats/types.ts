import { z } from 'zod';
import type { Match, MatchParticipant } from '../../base/Match.js';
import type { Tournament } from '../../base/Tournament.js';
import type { Team } from '../../base/Team.js';
import type { AllianceMember } from '../../base/Alliance.js';
import type { TournamentType } from '../../base/Schedule.js';
export type Json =
  null | boolean | number | string | Json[] | { [key: string]: Json };
// Registered with an `id` (zod v4's `.meta()` -> `z.globalRegistry`) because
// this schema is recursive AND reused across multiple routes' request/
// response schemas (Stats controller params/result, catalogue params/result
// schemas, etc.). Without an id, fastify-type-provider-zod's OpenAPI
// transform (`createJsonSchemaTransformObject`) has no name to hoist this
// self-referential type to `components.schemas` under, and instead emits an
// unresolvable inline `$ref` (e.g. `#/components/schemas/schema0`) that
// doesn't exist anywhere in the document - see fastify-type-provider-zod's
// own `getReferenceUri`: "Recursive or self-referential schemas used inline
// must be registered with an `id` so they can be referenced as components."
export const jsonSchema: z.ZodType<Json> = z
  .lazy(() =>
    z.union([
      z.null(),
      z.boolean(),
      z.number(),
      z.string(),
      z.array(jsonSchema),
      z.record(z.string(), jsonSchema)
    ])
  )
  .meta({ id: 'Json' });
export type StatMatch = Match<
  { eventKey: string; tournamentKey: string; id: number } & Record<string, Json>
>;
export interface AuditRow {
  eventKey: string;
  tournamentKey: string;
  id: number;
  occurredAtUtc: string;
  actionEventId?: number;
  historyId?: number;
  revision?: number | null;
  persisted?: number;
  sourceEvent?: string;
  fieldPath?: string | null;
  oldValueJson?: string | null;
  newValueJson?: string | null;
  deltaNumber?: number | null;
  actorId?: string | null;
  actorName?: string | null;
  clientId?: string | null;
  socketId?: string | null;
  correlationId?: string | null;
  source?: string | null;
  actionType?: string;
  [key: string]: Json | undefined;
}
export interface SourceMarker {
  latestMatchUpdatedAtUtc: string | null;
  latestHistoryId: number | null;
  latestActionEventId: number | null;
}
export interface CalculatorContext {
  teamsPerAlliance?: number;
  eventKey: string;
  seasonKey: string;
  calculatedAsOfUtc: string;
  queryHash: string;
  tournaments: Tournament[];
  matches: StatMatch[];
  teams: Team[];
  alliances: AllianceMember[];
  rankings: Record<string, Json>[];
  actions: AuditRow[];
  history: AuditRow[];
  detailHistory: AuditRow[];
  settings: Record<string, Json>[];
  warnings: string[];
}
/**
 * The deduped, ascending-sorted teamKeys participating in one match - the
 * shared "teams in match" resolution behind `selectors.teamsInMatchId` (see
 * `selectorsSchema` below). Looks the match up in `ctx.matches` (already
 * filtered to whatever `filters.tournamentKeys`/`tournamentTypes` the query
 * carried), same as every other selector-driven lookup in this module - a
 * SCHEDULED match (not yet played) resolves fine, since the whole point is
 * "who's in the match coming up", not "who's already played". A missing
 * match resolves to `[]` rather than throwing; `registry.ts`'s shared
 * existence/ambiguity checks (mirroring `matchId`'s) are what actually
 * reject an unknown or ambiguous match before a stat's `compute()` ever
 * runs, so this is a defensive fallback, not the primary guard.
 */
export function teamsInMatch(
  ctx: CalculatorContext,
  matchId: number
): number[] {
  const match = ctx.matches.find((m) => m.id === matchId);
  return match
    ? [...new Set((match.participants ?? []).map((p) => p.teamKey))].sort(
        (a, b) => a - b
      )
    : [];
}
export const selectorsSchema = z
  .object({
    teamKey: z.number().int().positive().optional(),
    matchId: z.number().int().positive().optional(),
    allianceSeed: z.number().int().positive().optional(),
    /**
     * For a multi-team stat (its `teamKeys` derivation covers every team when
     * `teamKey` is absent - see `teamsInMatch` below): restricts that "every
     * team" set down to just the teams participating in this one match,
     * instead of the whole event's roster. Mutually exclusive with `teamKey`
     * in practice - a stat only ever consults this when `teamKey` itself is
     * unset - but both may be present on the wire; `teamKey` always wins.
     */
    teamsInMatchId: z.number().int().positive().optional(),
    /**
     * The third way to supply a multi-team stat's subjects: an explicit,
     * hand-picked list of teams, unconnected to any one match (see
     * `resolveTeamKeys`'s shared precedence below). Deduped/sorted at
     * resolution time, so caller order and duplicates never matter.
     * Mutually exclusive with `teamKey`/`teamsInMatchId` in practice, same
     * "more specific wins" rule as those two.
     */
    teamKeyList: z.array(z.number().int().positive()).min(1).max(64).optional()
  })
  .strict();
/**
 * The single shared precedence every multi-team stat's `teamKeys`/`keys`
 * derivation follows, so the three "who" selectors resolve identically
 * everywhere instead of each compute module re-deriving its own order:
 *   1. `teamKey` - one specific team, wins outright.
 *   2. `teamsInMatchId` - a match's participants (see `teamsInMatch`).
 *   3. `teamKeyList` - an explicit, hand-picked list (deduped, sorted).
 *   4. `allTeams()` - only once all three above are absent. Different stats
 *      mean different things by "every team" (every team that has actually
 *      played vs. every team registered to the event), so the caller
 *      supplies it rather than this function assuming one.
 */
export function resolveTeamKeys(
  ctx: CalculatorContext,
  s: StatsQuery['selectors'],
  allTeams: () => number[]
): number[] {
  if (s.teamKey !== undefined) return [s.teamKey];
  if (s.teamsInMatchId !== undefined)
    return teamsInMatch(ctx, s.teamsInMatchId);
  if (s.teamKeyList !== undefined && s.teamKeyList.length > 0)
    return [...new Set(s.teamKeyList)].sort((a, b) => a - b);
  return allTeams();
}
export const tournamentTypes = [
  'Test',
  'Practice',
  'Qualification',
  'Ranking',
  'Round Robin',
  'Eliminations',
  'Finals'
] as const;
export const filtersSchema = z
  .object({
    tournamentKeys: z.array(z.string().min(1)).max(200).optional(),
    tournamentTypes: z.array(z.enum(tournamentTypes)).optional(),
    tournamentLevels: z.array(z.number().int()).max(200).optional()
  })
  .strict();
export const querySchema = z
  .object({
    eventKey: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/),
    stat: z.string().min(1).max(150),
    selectors: selectorsSchema.default({}),
    filters: filtersSchema.default({}),
    params: z.record(z.string(), jsonSchema).default({})
  })
  .strict();
export type StatsQuery = z.infer<typeof querySchema>;
export const commonParamsSchema = z
  .object({
    alliance: z.enum(['red', 'blue']).default('red'),
    windowSeconds: z.number().positive().max(150).default(10),
    window: z.number().int().positive().max(1000).default(3),
    bins: z
      .array(z.number())
      .min(2)
      .max(101)
      .refine(
        (v) => v.every((n, i) => !i || n > v[i - 1]),
        'Bins must strictly increase'
      )
      .default([0, 100, 200, 300, 400, 500, 750, 1100]),
    opponentTeamKey: z.number().int().positive().optional(),
    replacementTeamKey: z.number().int().positive().optional(),
    partnerTeamKey: z.number().int().positive().optional(),
    countries: z.array(z.string().min(1)).max(2).optional(),
    atUtc: z.iso.datetime({ offset: true }).optional(),
    samples: z.number().int().min(100).max(10000).default(1000),
    seed: z.number().int().min(0).max(4294967295).optional(),
    lambda: z.number().min(0).max(1000).default(1),
    balls: z.number().min(0).max(500).default(1),
    metric: z.enum(['opr', 'score', 'winRate']).default('opr')
  })
  .strict();
export type StatParams = z.infer<typeof commonParamsSchema>;
export const failureSchema = z
  .object({
    status: z.enum(['not_found', 'insufficient_data', 'unavailable']),
    reason: z.string().min(1),
    warnings: z.array(z.string())
  })
  .strict();
export const resultSchema = z.union([
  z
    .object({
      status: z.literal('ok'),
      data: jsonSchema,
      quality: z.enum(['complete', 'best_effort', 'degraded']),
      warnings: z.array(z.string())
    })
    .strict(),
  failureSchema
]);
export type StatResult = z.infer<typeof resultSchema>;
export type StatDependency =
  | 'matches'
  | 'details'
  | 'participants'
  | 'teams'
  | 'rankings'
  | 'alliances'
  | 'actions'
  | 'history'
  | 'settings';
export interface StatDefinition<
  TParams = Record<string, Json>,
  TResult = StatResult
> {
  slug: string;
  catalogueId: string;
  name: string;
  description: string;
  seasonKey?: string;
  version: number;
  scope: 'event' | 'team' | 'match' | 'alliance';
  family: 'EMS' | 'DER' | 'REF';
  units: string;
  precision: number;
  defaultTournamentTypes?: TournamentType[];
  allowedTournamentTypes?: TournamentType[];
  dependencies: StatDependency[];
  qualityNotes: string[];
  supportedSelectors: (keyof StatsQuery['selectors'])[];
  paramsSchema: z.ZodType<TParams>;
  resultSchema: z.ZodType<TResult>;
  compute(
    ctx: CalculatorContext,
    params: TParams,
    selectors: StatsQuery['selectors']
  ): TResult | Promise<TResult>;
}
export const ok = (data: Json, warnings: string[] = []): StatResult => ({
  status: 'ok',
  data,
  quality: warnings.length ? 'best_effort' : 'complete',
  warnings
});
export const unavailable = (reason: string): StatResult => ({
  status: 'unavailable',
  reason,
  warnings: []
});
export const insufficient = (
  reason = 'No eligible observations'
): StatResult => ({ status: 'insufficient_data', reason, warnings: [] });
export const notFound = (reason: string): StatResult => ({
  status: 'not_found',
  reason,
  warnings: []
});
export const keyOf = (v: { tournamentKey: string; id: number }) =>
  JSON.stringify([v.tournamentKey, v.id]);
export const ownAlliance = (p: MatchParticipant) =>
  p.station < 20 ? 'red' : 'blue';
