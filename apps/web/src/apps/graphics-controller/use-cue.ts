import type { GraphicSpec, VariableValues } from '@toa-lib/models';
import { useCallback, useRef, useState } from 'react';
import {
  queryGraphicFrame,
  type GraphicFrameResult,
  type GraphicFrameUnavailable
} from '../../api/graphic-frame-query.js';
import { useMatchesForEvent } from '../../api/use-match-data.js';
import { useStatsCatalogue } from '../../api/use-stats-data.js';
import { useTeamsForEvent } from '../../api/use-team-data.js';

/**
 * A successfully-cued graphic. The query-and-adapt round trip itself lives
 * in `api/graphic-frame-query.ts`, shared with the preview (PVW-bus)
 * audience screen; these aliases keep this hook's long-standing
 * `CueResult`/`UnavailableResult` names for its existing consumers.
 */
export type CueResult = GraphicFrameResult;
export type UnavailableResult = GraphicFrameUnavailable;

export interface UseCueResult {
  /** The graphic last successfully cued and (if applicable) pushed - what the ACTIVE bar/live-monitor should reflect. */
  active: CueResult | null;
  /** Set instead of `active` when the last cue/push attempt was a normal 422 outcome. */
  activeUnavailable: UnavailableResult | null;
  /** A completed `recalculate()` result staged for review - never swapped in automatically. */
  pending: CueResult | null;
  pendingUnavailable: UnavailableResult | null;
  /** True while an initial (non-refresh) cue is in flight. */
  isCueing: boolean;
  /** True while a `refresh: true` recalculation is in flight. */
  isRecalculating: boolean;
  /**
   * Explicitly queries `spec` (refresh: false) and, on success, replaces
   * `active`/clears `pending`. This is the ONLY function in this hook meant
   * to be called from a direct producer action (a click on "Send to Air",
   * "Cue", or a catalogue entry) - never from an effect, a selection change,
   * or a timer.
   *
   * `values` supplies the variable values for any templated selectors on
   * `spec` (see `spec.bindings`). They are resolved into concrete selectors
   * BEFORE anything is sent to the stats API - if any binding cannot be
   * resolved from `values`, no request is issued at all and the normal
   * `{ status: 'unavailable' }` shape is produced instead. The values are
   * also remembered alongside the resulting `active`/`activeUnavailable`
   * spec so a later `recalculate()` re-resolves against the SAME values.
   */
  cue: (
    spec: GraphicSpec,
    values?: VariableValues
  ) => Promise<CueResult | null>;
  /**
   * Re-queries `active`'s (or `activeUnavailable`'s) spec with
   * `refresh: true`, reusing the exact `values` passed to the `cue()` call
   * that produced it. Stages the result into `pending`/`pendingUnavailable` -
   * `active` is left untouched until an explicit `push()`.
   */
  recalculate: () => Promise<void>;
  /** Promotes the staged `pending`/`pendingUnavailable` result into `active`/`activeUnavailable`. */
  push: () => CueResult | null;
  /** Drops every cue/pending result - used when clearing the transport or switching context. */
  reset: () => void;
}

/**
 * Owns the "what has been explicitly queried" state for the graphics
 * controller: the query-and-adapt round trip against `POST
 * /stats/:eventKey/query`, the 422-is-normal branch, and the
 * recalculate-then-push staging area. It NEVER fetches on its own - every
 * exported action here is a direct function call the page wires to a click
 * handler.
 */
export const useCue = (eventKey: string | null | undefined): UseCueResult => {
  const { data: catalogue = [] } = useStatsCatalogue(eventKey);
  const { data: teams = [] } = useTeamsForEvent(eventKey);
  const { data: matches = [] } = useMatchesForEvent(eventKey);

  const [active, setActive] = useState<CueResult | null>(null);
  const [activeUnavailable, setActiveUnavailable] =
    useState<UnavailableResult | null>(null);
  const [pending, setPending] = useState<CueResult | null>(null);
  const [pendingUnavailable, setPendingUnavailable] =
    useState<UnavailableResult | null>(null);
  const [isCueing, setIsCueing] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Kept in sync with the catalogue/teams/matches state above without
  // forcing every caller to pass them through on every call.
  const contextRef = useRef({ catalogue, teams, matches });
  contextRef.current = { catalogue, teams, matches };

  // The variable values from the most recent `cue()` call that produced the
  // current `active`/`activeUnavailable` spec. `recalculate()` reads this so
  // a refresh re-resolves against the SAME values rather than silently
  // dropping them and querying a different subject than what is on air.
  const activeValuesRef = useRef<VariableValues>({});

  const runQuery = useCallback(
    async (spec: GraphicSpec, refresh: boolean, values: VariableValues) => {
      if (!eventKey) throw new Error('No event selected');
      return queryGraphicFrame(eventKey, spec, {
        refresh,
        values,
        context: contextRef.current
      });
    },
    [eventKey]
  );

  const cue = useCallback(
    async (
      spec: GraphicSpec,
      values: VariableValues = {}
    ): Promise<CueResult | null> => {
      setIsCueing(true);
      try {
        const outcome = await runQuery(spec, false, values);
        setPending(null);
        setPendingUnavailable(null);
        if (outcome.ok) {
          activeValuesRef.current = values;
          setActive(outcome.result);
          setActiveUnavailable(null);
          return outcome.result;
        }
        activeValuesRef.current = values;
        setActive(null);
        setActiveUnavailable(outcome.unavailable);
        return null;
      } finally {
        setIsCueing(false);
      }
    },
    [runQuery]
  );

  const recalculate = useCallback(async (): Promise<void> => {
    const spec = active?.spec ?? activeUnavailable?.spec;
    if (!spec) return;
    const values = activeValuesRef.current;
    setIsRecalculating(true);
    try {
      const outcome = await runQuery(spec, true, values);
      if (outcome.ok) {
        setPending(outcome.result);
        setPendingUnavailable(null);
      } else {
        setPending(null);
        setPendingUnavailable(outcome.unavailable);
      }
    } finally {
      setIsRecalculating(false);
    }
  }, [runQuery, active, activeUnavailable]);

  const push = useCallback((): CueResult | null => {
    if (pending) {
      setActive(pending);
      setActiveUnavailable(null);
      setPending(null);
      setPendingUnavailable(null);
      return pending;
    }
    if (pendingUnavailable) {
      setActive(null);
      setActiveUnavailable(pendingUnavailable);
      setPending(null);
      setPendingUnavailable(null);
    }
    return null;
  }, [pending, pendingUnavailable]);

  const reset = useCallback(() => {
    setActive(null);
    setActiveUnavailable(null);
    setPending(null);
    setPendingUnavailable(null);
  }, []);

  return {
    active,
    activeUnavailable,
    pending,
    pendingUnavailable,
    isCueing,
    isRecalculating,
    cue,
    recalculate,
    push,
    reset
  };
};
