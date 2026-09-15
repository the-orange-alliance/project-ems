import { ApiResponseError, TournamentType } from '@toa-lib/models';
import type { StatDependency } from '@toa-lib/models/seasons/stats/presentation';
import { tournamentTypes } from '@toa-lib/models/seasons/stats';
import useSWR, { SWRResponse } from 'swr';
import { z } from 'zod';
import { localClient } from './http-clients.js';
import { requireCollection } from './load-state.js';

/**
 * One row of `GET /stats/:eventKey/catalogue` - the 232-entry stats
 * catalogue served by the stats engine (see
 * `apps/services/api/src/controllers/Stats.ts` /
 * `libs/models/src/seasons/stats/registry.ts#catalogueMetadata`).
 *
 * NOTE: `family` here is DATA PROVENANCE ('EMS' = live event data, 'DER' =
 * derived/computed, 'REF' = reference/season rules) - it has nothing to do
 * with the *visualization* family returned by `presentationFor` in
 * `@toa-lib/models`. Don't conflate the two when picking a `GraphicKind`.
 */
export interface StatCatalogueEntry {
  catalogueId: string;
  name: string;
  slug: string;
  description: string;
  family: 'EMS' | 'DER' | 'REF';
  /** `null` when the stat is season-agnostic (a "generic" calculator). */
  seasonKey: string | null;
  version: number;
  scope: 'event' | 'team' | 'match' | 'alliance';
  units: string;
  precision: number;
  dependencies: StatDependency[];
  qualityNotes: string[];
  supportedSelectors: (
    'teamKey' | 'matchId' | 'allianceSeed' | 'teamsInMatchId' | 'teamKeyList'
  )[];
  /**
   * Seeded onto a fresh query's `filters.tournamentTypes` so a producer
   * never has to pick this themselves. Also the boundary the API enforces:
   * a query whose `filters.tournamentTypes` falls outside
   * `allowedTournamentTypes` is rejected with HTTP 400.
   */
  defaultTournamentTypes?: TournamentType[];
  allowedTournamentTypes?: TournamentType[];
  paramsSchema: Record<string, unknown>;
  resultSchema: Record<string, unknown>;
  supportedFilters: string[];
}

const catalogueKey = (eventKey: string) =>
  ['/stats', eventKey, 'catalogue'] as const;

/** Validate the metadata producer forms consume, including selector/schema arrays.
 * The API omits seasonKey for generic stats; normalize that to the public type.
 */
const catalogueSchema = z.array(
  z.object({
    catalogueId: z.string(),
    name: z.string(),
    slug: z.string(),
    description: z.string(),
    family: z.enum(['EMS', 'DER', 'REF']),
    seasonKey: z
      .string()
      .nullish()
      .transform((value) => value ?? null),
    version: z.number().int(),
    scope: z.enum(['event', 'team', 'match', 'alliance']),
    units: z.string(),
    precision: z.number().int(),
    dependencies: z.array(
      z.enum([
        'matches',
        'details',
        'participants',
        'teams',
        'rankings',
        'alliances',
        'actions',
        'history',
        'settings'
      ])
    ),
    qualityNotes: z.array(z.string()),
    supportedSelectors: z.array(
      z.enum([
        'teamKey',
        'matchId',
        'allianceSeed',
        'teamsInMatchId',
        'teamKeyList'
      ])
    ),
    defaultTournamentTypes: z.array(z.enum(tournamentTypes)).optional(),
    allowedTournamentTypes: z.array(z.enum(tournamentTypes)).optional(),
    paramsSchema: z.record(z.string(), z.unknown()),
    resultSchema: z.record(z.string(), z.unknown()),
    supportedFilters: z.array(z.string())
  })
);

export const statsApi = {
  get: {
    catalogue: (eventKey: string): Promise<StatCatalogueEntry[] | null> =>
      localClient.get<StatCatalogueEntry[]>(`/stats/${eventKey}/catalogue`)
  }
};

/**
 * Fetches the stats catalogue ONCE per event key and caches it - this is a
 * ~232-row, effectively-static list (it only changes with a service
 * deploy), so there is no reason to ever revalidate it on window focus.
 */
export const useStatsCatalogue = (
  eventKey: string | null | undefined
): SWRResponse<StatCatalogueEntry[], ApiResponseError> =>
  useSWR<
    StatCatalogueEntry[],
    ApiResponseError,
    readonly [string, string, string] | null
  >(
    eventKey ? catalogueKey(eventKey) : null,
    ([, eKey]) =>
      statsApi.get
        .catalogue(eKey)
        .then((res) =>
          catalogueSchema.parse(requireCollection(res, 'catalogue'))
        ),
    { revalidateOnFocus: false }
  );
