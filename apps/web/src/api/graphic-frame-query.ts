import type { GraphicSpec, VizFrame, VariableValues } from '@toa-lib/models';
import { resolveSpec, unresolvedBindings } from '@toa-lib/models';
import {
  prepareGraphicFrame,
  type AdaptContext,
  type StatResult
} from '@toa-lib/models/seasons/stats/presentation';
import { localClient } from './http-clients.js';
import type { StatCatalogueEntry } from './use-stats-data.js';
import { resultSchema } from '@toa-lib/models/seasons/stats';
import { z } from 'zod';
import { LoadError } from './load-state.js';

const queryResponseSchema = z.object({
  result: resultSchema,
  calculatedAsOfUtc: z.iso.datetime({ offset: true }),
  latestPlayedMatch: z
    .object({
      eventKey: z.string(),
      tournamentKey: z.string(),
      id: z.number(),
      name: z.string(),
      actualStartTime: z.string(),
      updatedAtUtc: z.string().nullable()
    })
    .nullable(),
  cache: z.enum(['fresh', 'stale', 'miss']),
  refreshQueued: z.boolean(),
  cacheAgeMs: z.number().nonnegative()
});

function decodeQuery(payload: unknown): StatsQueryResponseBody {
  const parsed = queryResponseSchema.safeParse(payload);
  if (!parsed.success)
    throw new LoadError(
      'query',
      'validation',
      'Invalid stats query response.',
      parsed.error
    );
  return parsed.data;
}

/**
 * The one query-and-adapt round trip against `POST /stats/:eventKey/query`,
 * shared by every browser-side surface that needs to turn a `GraphicSpec`
 * into a render-ready `VizFrame`:
 *
 *  - the producer's timeline preflight check (`use-timeline-preflight.ts`),
 *    which only reports whether a timeline's items would calculate - it
 *    never feeds the transport (Cue / Quick Stat / recalculate all go
 *    through the authoritative API playback commands);
 *  - the preview (PVW-bus) audience screen (`use-preview-frame.ts`), which
 *    must calculate the NEXT item itself because the server only ever
 *    prepares the cue lane (GRAPHICS_PLAYBACK_POLICY.navigation:
 *    'prepare-cue-only').
 *
 * Lives here, rather than being duplicated per caller, specifically because
 * of the 422-is-a-normal-outcome branch below: getting that wrong turns an
 * ordinary "this stat has no data yet" into a thrown request failure.
 */

/**
 * The subset of `POST /stats/:eventKey/query`'s response body (see
 * `responseSchema` in `apps/services/api/src/stats/StatsSchemas.ts`) this
 * module actually reads. The endpoint returns this SAME shape on both a 200
 * (`result.status === 'ok'`) and a 422 (every other `result.status`) - the
 * status code is only a transport-level hint, never the signal to branch on.
 */
export interface StatsQueryResponseBody {
  result: StatResult;
  calculatedAsOfUtc: string;
  latestPlayedMatch: {
    eventKey: string;
    tournamentKey: string;
    id: number;
    name: string;
    actualStartTime: string;
    updatedAtUtc: string | null;
  } | null;
  cache: 'fresh' | 'stale' | 'miss';
  refreshQueued: boolean;
  cacheAgeMs: number;
}

/**
 * A successfully-queried graphic: the query returned `result.status === 'ok'`
 * and has already been run through `prepareGraphicFrame` into a render-ready
 * `VizFrame`. This - never a bare `StatResult` - is what a caller hands to
 * `GraphicRenderer` / the live-monitor / the socket `preview` emit.
 */
export interface GraphicFrameResult {
  spec: GraphicSpec;
  frame: VizFrame;
  calculatedAsOfUtc: string;
  cache: 'fresh' | 'stale' | 'miss';
  refreshQueued: boolean;
  cacheAgeMs: number;
  warnings: string[];
  quality: 'complete' | 'best_effort' | 'degraded';
  latestPlayedMatch: StatsQueryResponseBody['latestPlayedMatch'];
}

/**
 * A NORMAL (not exceptional) outcome of a query: the stat could not be
 * computed for a producer-facing reason. HTTP 422 is how the API spells
 * this - it is never treated as a failed request.
 */
export interface GraphicFrameUnavailable {
  spec: GraphicSpec;
  status: 'not_found' | 'insufficient_data' | 'unavailable';
  reason: string;
  warnings: string[];
}

export type GraphicFrameOutcome =
  | { ok: true; result: GraphicFrameResult }
  | { ok: false; unavailable: GraphicFrameUnavailable };

/** The entity lookups `prepareGraphicFrame` needs, plus the catalogue used to map `spec.stat` -> `catalogueId`. */
export interface GraphicFrameContext extends Pick<
  AdaptContext,
  'teams' | 'matches'
> {
  catalogue: StatCatalogueEntry[];
}

interface HttpErrorLike {
  status: number;
  payload?: unknown;
}

/**
 * `HttpClient` (see `libs/client/src/providers/HttpClient.ts`) throws its
 * `HttpError` class on every non-2xx response, but that class is not part of
 * `@toa-lib/client`'s public barrel (only `HttpClient` itself is exported -
 * see `libs/client/src/providers/index.ts`), so it cannot be imported here
 * to `instanceof`-check against. Duck-typing the `status`/`payload` shape
 * `HttpError` is documented to carry is the only way to recognize it from
 * outside the package.
 */
function isHttpErrorLike(e: unknown): e is HttpErrorLike {
  return (
    !!e &&
    typeof e === 'object' &&
    'status' in e &&
    typeof (e as { status: unknown }).status === 'number'
  );
}

/**
 * Queries `spec` and adapts the result into a render-ready frame.
 *
 * `values` supplies the variable values for any templated selectors on
 * `spec` (see `spec.bindings`). They are resolved into concrete selectors
 * BEFORE anything is sent to the stats API - if any binding cannot be
 * resolved from `values`, no request is issued at all and the normal
 * `{ status: 'unavailable' }` shape is produced instead.
 *
 * Throws only for genuine failures (400/404/503/504, network, an unknown
 * stat slug). Every producer-facing "cannot compute this" outcome comes back
 * as `{ ok: false }`.
 */
export async function queryGraphicFrame(
  eventKey: string,
  spec: GraphicSpec,
  options: {
    refresh: boolean;
    values: VariableValues;
    context: GraphicFrameContext;
  }
): Promise<GraphicFrameOutcome> {
  const { refresh, values, context } = options;

  const entry = context.catalogue.find(
    (c: StatCatalogueEntry) => c.slug === spec.stat
  );
  if (!entry) {
    throw new LoadError(
      'catalogue',
      'validation',
      `Unknown stat "${spec.stat}" in the loaded catalogue.`
    );
  }

  // Resolve template variables into concrete selectors BEFORE anything
  // is built for the request. The stats API's selector schema is
  // `.strict()` and types every selector as a positive integer, so an
  // unresolved variable can never safely reach it - blocking here with a
  // clear producer-facing reason is strictly better than a confusing
  // 400/422 mid-show.
  const missing = unresolvedBindings(spec, values);
  if (missing.length > 0) {
    return {
      ok: false,
      unavailable: {
        spec,
        status: 'unavailable',
        reason: `Fill in: ${missing.join(', ')}`,
        warnings: []
      }
    };
  }
  const resolved = resolveSpec(spec, values);

  try {
    const payload = await localClient.post<unknown>(
      `/stats/${eventKey}/query`,
      {
        body: {
          stat: resolved.stat,
          selectors: resolved.selectors,
          filters: resolved.filters,
          params: resolved.params,
          refresh
        }
      }
    );
    const res = decodeQuery(payload);

    if (res.result.status !== 'ok') {
      return {
        ok: false,
        unavailable: {
          spec: resolved,
          status: res.result.status,
          reason: res.result.reason,
          warnings: res.result.warnings
        }
      };
    }

    const ctx: AdaptContext = {
      catalogueId: entry.catalogueId,
      teams: context.teams,
      matches: context.matches,
      asOfUtc: res.calculatedAsOfUtc
    };
    let frame: VizFrame;
    try {
      frame = prepareGraphicFrame(res.result, resolved, ctx);
    } catch (cause) {
      throw new LoadError(
        'adaptation',
        'adaptation',
        cause instanceof Error
          ? cause.message
          : 'Unable to adapt the stats result.',
        cause
      );
    }

    return {
      ok: true,
      result: {
        spec: resolved,
        frame,
        calculatedAsOfUtc: res.calculatedAsOfUtc,
        cache: res.cache,
        refreshQueued: res.refreshQueued,
        cacheAgeMs: res.cacheAgeMs,
        warnings: res.result.warnings,
        quality: res.result.quality,
        latestPlayedMatch: res.latestPlayedMatch
      }
    };
  } catch (e) {
    // HTTP 422 is a NORMAL outcome carrying the same response body as a
    // 200 - `HttpClient` throws on it purely because it's a non-2xx
    // status, not because anything actually failed. Recover the body
    // from the thrown error's payload and treat it exactly like the
    // 200/`result.status !== 'ok'` branch above, rather than letting it
    // propagate as a generic request failure.
    if (isHttpErrorLike(e) && e.status === 422) {
      const { result } = decodeQuery(e.payload);
      if (result.status === 'ok')
        throw new LoadError(
          'query',
          'validation',
          'Invalid successful result on HTTP 422.'
        );
      return {
        ok: false,
        unavailable: {
          spec: resolved,
          status: result.status,
          reason: result.reason,
          warnings: result.warnings
        }
      };
    }
    // Anything else (400/404/503/504, network failure, ...) is a real
    // error - let it propagate so the caller's own error handling
    // (a snackbar) can surface it.
    throw e;
  }
}
