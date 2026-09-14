import type {
  GraphicSpec,
  GraphicsError,
  VariableValues
} from '@toa-lib/models';
import { SUPPORTED_GRAPHIC_MODES, unresolvedBindings } from '@toa-lib/models';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  queryGraphicFrame,
  type GraphicFrameContext
} from '../../api/graphic-frame-query.js';
import { useMatchesForEvent } from '../../api/use-match-data.js';
import {
  useStatsCatalogue,
  type StatCatalogueEntry
} from '../../api/use-stats-data.js';
import { useTeamsForEvent } from '../../api/use-team-data.js';

/**
 * What a timeline item's cue WILL do when the transport reaches it.
 *
 * `'error'` is the load-bearing one: it means `PlaybackNavigation.prepareCueAt`
 * will write `cue.status = 'failed'` for this item, and the `take` that
 * immediately follows an `advance` onto it will reject `NOT_READY` (see
 * `describeCueNotReady` in `@toa-lib/models`). That is precisely the mid-show
 * failure this hook exists to predict.
 *
 * `'calculating'` is NOT a prediction of failure - it only means this item's
 * own check is still in flight. It must never be presented as "will not fire".
 */
export type CueReadiness =
  | { state: 'ready' }
  | { state: 'calculating' }
  | {
      state: 'error';
      code: GraphicsError['code'];
      /** Producer-facing reason, worded to MATCH what the server's own rejection would say. */
      reason: string;
      checkedAtUtc: string;
    };

export interface UseTimelinePreflightResult {
  /** Per-item readiness, keyed by `GraphicSpec.id`. An item with no entry has not been checked. */
  readiness: Record<string, CueReadiness>;
  /** Drops every cached verdict from `fromIndex` onward and re-runs the checks. */
  recheck: () => void;
}

/** How many item queries may be in flight at once. A 20-item timeline must not slam the stats worker pool mid-show. */
const MAX_PARALLEL_CHECKS = 4;

/**
 * Identity of "this exact spec, resolved against these exact values". Changing
 * an item in the inspector, or loading the timeline with different variable
 * values, must invalidate that item's verdict and nothing else.
 *
 * `JSON.stringify` is sufficient here (rather than the models package's
 * `canonicalJson`): a key collision is impossible and the only cost of a key
 * that changes when it didn't need to is one redundant, cache-backed re-check.
 */
function itemKey(spec: GraphicSpec, valuesKey: string): string {
  return `${spec.id}|${JSON.stringify(spec)}|${valuesKey}`;
}

/**
 * The three failures that need NO network call, mirrored one-for-one from the
 * server's own prepare path so the reason string a producer reads here is the
 * one they would have seen in the mid-show snackbar:
 *
 *  1. an unresolved template binding - `PlaybackNavigation.prepareCueAt` never
 *     calls the stats service at all in this case and fails the cue straight
 *     away with `Fill in: <names>`;
 *  2. a stat slug the catalogue doesn't have - the server's own
 *     `catalogue.find(...)` miss, `CALCULATION_FAILED`;
 *  3. a kind/mode pair `preparedGraphicSpecZod` rejects, which throws out of
 *     `beginPreparation` before any ticket exists.
 *
 * Returns `null` when the spec clears all three - i.e. it is worth querying.
 */
function staticCheck(
  spec: GraphicSpec,
  values: VariableValues,
  catalogue: StatCatalogueEntry[]
): { code: GraphicsError['code']; reason: string } | null {
  const missing = unresolvedBindings(spec, values);
  if (missing.length > 0) {
    // Worded exactly as `PlaybackNavigation.prepareCueAt` words it.
    return { code: 'INVALID_INPUT', reason: `Fill in: ${missing.join(', ')}` };
  }
  if (!catalogue.some((entry) => entry.slug === spec.stat)) {
    return {
      code: 'CALCULATION_FAILED',
      reason: `Unknown stat "${spec.stat}".`
    };
  }
  if (!SUPPORTED_GRAPHIC_MODES[spec.kind]?.includes(spec.mode)) {
    return {
      code: 'INVALID_INPUT',
      reason: `Unsupported graphic kind and presentation mode: a "${spec.kind}" graphic cannot render as "${spec.mode}".`
    };
  }
  return null;
}

/** Recovers a producer-facing message from whatever `queryGraphicFrame` threw (400/404/503, network, ...). */
function thrownReason(error: unknown): string {
  if (error && typeof error === 'object' && 'payload' in error) {
    const { payload } = error as { payload?: unknown };
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const { message } = payload as { message?: unknown };
      if (typeof message === 'string' && message.length > 0) return message;
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Calculation failed.';
}

/**
 * Predicts, for every item from `fromIndex` onward, whether its cue will be
 * ready when the transport reaches it.
 *
 * WHY THIS EXISTS: the playback coordinator prepares the cue lane and nothing
 * else (`GRAPHICS_PLAYBACK_POLICY.navigation: 'prepare-cue-only'`), so an item
 * is only ever prepared at the moment the playhead lands on it. A broken item
 * therefore announces itself as a `NOT_READY` rejection *during* the show, one
 * press too late. This walks ahead of the playhead and finds those items early.
 *
 * Runs the SAME `queryGraphicFrame` round trip the producer's own Cue path and
 * the PVW screen use (`api/graphic-frame-query.ts`) - same `unresolvedBindings`
 * check, same `POST /stats/:eventKey/query`, same `prepareGraphicFrame`
 * adapter, same 422-is-normal branch - so a verdict here is a faithful dry run
 * of `PlaybackNavigation.prepareCueAt`, not an approximation of one.
 *
 * Deliberately `refresh: false`: this is a prediction, not a recalculation. It
 * reads the cache the on-deck warm (`use-queue-row-refresh.ts`) has usually
 * already populated, and a cold miss simply warms the entry that the cue is
 * about to need anyway. It must never force recomputation mid-show.
 *
 * Structured after `use-queue-row-refresh.ts`, which already fans a query out
 * across every item of a timeline - the difference is that this one KEEPS each
 * outcome instead of `allSettled`-ing them into the void.
 */
export const useTimelinePreflight = (
  eventKey: string | null | undefined,
  items: GraphicSpec[],
  values: VariableValues,
  fromIndex: number
): UseTimelinePreflightResult => {
  const { data: catalogue = [] } = useStatsCatalogue(eventKey);
  const { data: teams = [] } = useTeamsForEvent(eventKey);
  const { data: matches = [] } = useMatchesForEvent(eventKey);

  // Verdicts keyed by `itemKey` (spec content + values), NOT by `spec.id`
  // alone - editing an item must retire the verdict that described its old
  // content rather than leave a stale badge attached to the same id.
  const [verdicts, setVerdicts] = useState<Record<string, CueReadiness>>({});
  const [recheckGeneration, setRecheckGeneration] = useState(0);
  const inFlightRef = useRef<Set<string>>(new Set());

  // Read inside the effect without making the effect depend on their
  // identities - `teams`/`matches` only supply display labels, and re-running
  // every check because an unrelated SWR response landed would be pure waste.
  const contextRef = useRef<GraphicFrameContext>({ catalogue, teams, matches });
  contextRef.current = { catalogue, teams, matches };

  const valuesKey = useMemo(() => JSON.stringify(values ?? {}), [values]);

  // The items this hook is responsible for, paired with their cache keys.
  // Everything BEFORE the playhead is already behind the show and is not worth
  // a request.
  const pending = useMemo(
    () =>
      items
        .slice(Math.max(0, fromIndex))
        .map((spec) => ({ spec, key: itemKey(spec, valuesKey) })),
    [items, fromIndex, valuesKey]
  );

  // One string that changes exactly when the set of things to check changes.
  // The effect below keys off this rather than `pending` itself, whose array
  // identity is fresh on every render.
  const signature = useMemo(
    () => pending.map((entry) => entry.key).join('\n'),
    [pending]
  );

  useEffect(() => {
    if (!eventKey) return;
    // The catalogue is a hard prerequisite: `queryGraphicFrame` throws on an
    // unrecognized `spec.stat`, and the static pass would report every item as
    // an unknown stat if it ran against an empty one.
    if (catalogue.length === 0) return;

    const queue = pending.filter(
      ({ key }) => !inFlightRef.current.has(key) && verdicts[key] === undefined
    );
    if (queue.length === 0) return;

    let cancelled = false;
    const settle = (key: string, readiness: CueReadiness) => {
      inFlightRef.current.delete(key);
      if (cancelled) return;
      setVerdicts((prev) => ({ ...prev, [key]: readiness }));
    };

    // Static pass first, synchronously: these need no network and should paint
    // the instant a timeline is loaded.
    const needsQuery: typeof queue = [];
    const immediate: Record<string, CueReadiness> = {};
    for (const entry of queue) {
      const failure = staticCheck(entry.spec, values ?? {}, catalogue);
      if (failure) {
        immediate[entry.key] = {
          state: 'error',
          code: failure.code,
          reason: failure.reason,
          checkedAtUtc: new Date().toISOString()
        };
        continue;
      }
      needsQuery.push(entry);
    }
    if (Object.keys(immediate).length > 0) {
      setVerdicts((prev) => ({ ...prev, ...immediate }));
    }
    if (needsQuery.length === 0) return;

    for (const { key } of needsQuery) inFlightRef.current.add(key);

    // Bounded worker pool: `MAX_PARALLEL_CHECKS` consumers share one cursor
    // over `needsQuery`, so at most that many requests are ever outstanding
    // however long the timeline is.
    let cursor = 0;
    const runNext = async (): Promise<void> => {
      while (!cancelled) {
        const entry = needsQuery[cursor++];
        if (!entry) return;
        try {
          const outcome = await queryGraphicFrame(eventKey, entry.spec, {
            refresh: false,
            values: values ?? {},
            context: contextRef.current
          });
          settle(
            entry.key,
            outcome.ok
              ? { state: 'ready' }
              : {
                  state: 'error',
                  code: 'CALCULATION_FAILED',
                  reason: outcome.unavailable.reason,
                  checkedAtUtc: new Date().toISOString()
                }
          );
        } catch (error) {
          // A genuine request failure (400 from the calculator, 404, network,
          // ...). The cue would fail here too, so this is an error verdict -
          // never a silently-swallowed one, which is the whole bug.
          settle(entry.key, {
            state: 'error',
            code: 'CALCULATION_FAILED',
            reason: thrownReason(error),
            checkedAtUtc: new Date().toISOString()
          });
        }
      }
    };

    void Promise.all(
      Array.from(
        { length: Math.min(MAX_PARALLEL_CHECKS, needsQuery.length) },
        () => runNext()
      )
    );

    return () => {
      cancelled = true;
      for (const { key } of needsQuery) inFlightRef.current.delete(key);
    };
    // `verdicts` is read above but deliberately NOT a dependency: it is written
    // by this effect, so depending on it would re-enter on every settle. The
    // `signature` covers every input that should genuinely restart the sweep.
  }, [eventKey, signature, catalogue.length, recheckGeneration]);

  const recheck = useCallback(() => {
    const stale = new Set(pending.map((entry) => entry.key));
    setVerdicts((prev) =>
      Object.fromEntries(
        Object.entries(prev).filter(([key]) => !stale.has(key))
      )
    );
    // Deleting verdicts alone does not change the effect's input signature;
    // this explicit generation starts a new sweep after React commits the
    // deletion (including when no verdict existed yet).
    setRecheckGeneration((generation) => generation + 1);
  }, [pending]);

  // Project the content-keyed verdicts back onto `spec.id`, which is what the
  // row components key off. An item still in flight reports `calculating`
  // rather than falling through as "no badge", so a slow check reads as
  // "checking" instead of "fine".
  const readiness = useMemo(() => {
    const next: Record<string, CueReadiness> = {};
    for (const { spec, key } of pending) {
      const verdict = verdicts[key];
      next[spec.id] = verdict ?? { state: 'calculating' };
    }
    return next;
  }, [pending, verdicts]);

  return { readiness, recheck };
};

export default useTimelinePreflight;
