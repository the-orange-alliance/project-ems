import type { GraphicSpec } from '@toa-lib/models';
import useSWR from 'swr';
import {
  queryGraphicFrame,
  type GraphicFrameContext,
  type GraphicFrameOutcome,
  type GraphicFrameResult
} from 'src/api/graphic-frame-query.js';
import {
  failedLoad,
  requestLoadState,
  type LoadState
} from 'src/api/load-state.js';
import { useMatchesForEvent } from 'src/api/use-match-data.js';
import { useStatsCatalogue } from 'src/api/use-stats-data.js';
import { useTeamsForEvent } from 'src/api/use-team-data.js';

/** Canonical JSON avoids invalidation from object property insertion order. */
export function stableIdentity(value: unknown): string {
  return JSON.stringify(value, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, item[key]])
        )
      : item
  );
}

/** Fields read by generic/semantic adapters. Preserve order: lookups use find(). */
export function rosterIdentity({
  teams,
  matches
}: Pick<GraphicFrameContext, 'teams' | 'matches'>): string {
  return stableIdentity({
    teams: teams?.map(({ teamKey, teamNumber, teamNameShort }) => ({
      teamKey,
      teamNumber,
      teamNameShort
    })),
    matches: matches?.map(({ id, tournamentKey, name, participants }) => ({
      id,
      tournamentKey,
      name,
      participants: participants?.map(({ teamKey, station }) => ({
        teamKey,
        station
      }))
    }))
  });
}

export type PreviewFrameState = LoadState<GraphicFrameResult | null> & {
  retry: () => Promise<unknown>;
};
interface IdentifiedOutcome {
  identity: string;
  eventKey: string;
  outcome: GraphicFrameOutcome;
}

/** PVW calculates independently of authoritative cue preparation. Retain identified
 * outcomes so spec/frame stay in lockstep without claiming a previous cue is current.
 */
export const usePreviewFrame = (
  eventKey: string | null | undefined,
  spec: GraphicSpec | null
): PreviewFrameState => {
  const catalogue = useStatsCatalogue(eventKey);
  const teams = useTeamsForEvent(eventKey);
  const matches = useMatchesForEvent(eventKey);
  const dependencies = [
    requestLoadState('catalogue', catalogue),
    requestLoadState('teams', teams),
    requestLoadState('matches', matches)
  ];
  const blocked =
    dependencies.find(
      (state) => state.status === 'error' || state.status === 'unavailable'
    ) || dependencies.find((state) => state.status === 'loading');
  const serializedSpec = stableIdentity(spec);
  const identity = stableIdentity([
    eventKey,
    spec,
    catalogue.data?.map(({ slug, catalogueId }) => ({ slug, catalogueId })),
    rosterIdentity({ teams: teams.data, matches: matches.data })
  ]);
  const request = useSWR<
    IdentifiedOutcome,
    unknown,
    readonly [string, string, string, string] | null
  >(
    eventKey && spec && !blocked
      ? ['graphics-preview-frame', eventKey, serializedSpec, identity]
      : null,
    async ([, key, serialized, requestedIdentity]) => ({
      identity: requestedIdentity,
      eventKey: key,
      outcome: await queryGraphicFrame(
        key,
        JSON.parse(serialized) as GraphicSpec,
        {
          refresh: false,
          values: {},
          context: {
            catalogue: catalogue.data!,
            teams: teams.data,
            matches: matches.data
          }
        }
      )
    }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      keepPreviousData: true,
      shouldRetryOnError: false
    }
  );
  const retry = async () => {
    const failed = [catalogue, teams, matches].filter(
      (dependency) => dependency.error
    );
    if (failed.length)
      return Promise.all(failed.map((dependency) => dependency.mutate()));
    return request.mutate();
  };
  const wrap = (
    state: LoadState<GraphicFrameResult | null>
  ): PreviewFrameState => ({ ...state, requestedIdentity: identity, retry });
  if (!spec) return wrap({ status: 'ready', source: 'preview', data: null });
  if (!eventKey)
    return wrap({
      status: 'unavailable',
      source: 'preview',
      code: 'unavailable',
      reason: 'Select an event to calculate the next cue.'
    });
  const previous =
    request.data?.eventKey === eventKey && request.data.outcome.ok
      ? request.data.outcome.result
      : undefined;
  if (blocked)
    return wrap(
      blocked.status === 'loading' ? { ...blocked, previous } : blocked
    );
  if (
    request.isValidating &&
    (request.error ||
      (request.data?.identity === identity && !request.data.outcome.ok))
  ) {
    return wrap({ status: 'loading', source: 'preview', previous });
  }
  if (request.error) return wrap(failedLoad('query', request.error));
  if (!request.data || request.data.identity !== identity)
    return wrap({ status: 'loading', source: 'preview', previous });
  const { outcome } = request.data;
  return wrap(
    outcome.ok
      ? { status: 'ready', source: 'preview', data: outcome.result }
      : {
          status: 'unavailable',
          source: 'query',
          code: outcome.unavailable.status,
          reason: outcome.unavailable.reason
        }
  );
};
