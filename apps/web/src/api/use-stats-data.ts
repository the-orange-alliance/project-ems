import { ApiResponseError, TournamentType } from '@toa-lib/models';
import type { StatDependency } from '@toa-lib/models/seasons/stats/presentation';
import useSWR, { SWRResponse } from 'swr';
import { localClient } from './http-clients.js';

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
    ([, eKey]) => statsApi.get.catalogue(eKey).then((res) => res ?? []),
    { revalidateOnFocus: false }
  );
