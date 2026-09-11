import { GraphicSpec, TemplateVariable, Timeline } from '@toa-lib/models';
import { useCallback, useEffect, useRef, useState } from 'react';
import { graphicsApi, useTimelines } from 'src/api/use-graphics-data.js';

export interface UseTimelineEditorResult {
  /**
   * The selected timeline as last seen from the server, with any staged
   * `setVariables()` edit merged in (mirroring how `items` below mirrors
   * `modifiedItems` over remote data) - so `timeline.variables` reflects
   * in-progress edits the same way `items` does. `null` when nothing is
   * selected.
   */
  timeline: Timeline | null;
  /** The items to render: the dirty buffer if there is one, else remote. */
  items: GraphicSpec[];
  /** True once any mutator below has staged a change since the last save/revert. */
  isDirty: boolean;
  /** True while `save()`'s PATCH request is in flight. */
  isSaving: boolean;
  save: () => Promise<void>;
  revert: () => void;
  reorder: (items: GraphicSpec[]) => void;
  updateItem: (id: string, patch: Partial<GraphicSpec>) => void;
  addItem: (item: GraphicSpec) => void;
  removeItem: (id: string) => void;
  duplicateItem: (id: string) => void;
  /**
   * Stages a full replacement of the timeline's declared template
   * variables. The ONE exception to the "items-only" buffer described
   * above (added for the variable editor in the graphics controller) -
   * follows the exact same staged/dirty/save-or-revert pattern as the item
   * mutators: nothing is sent to the server until `save()`.
   */
  setVariables: (variables: TemplateVariable[]) => void;
}

/**
 * Owns the dirty-edit buffer for the ITEMS of one `Timeline`.
 *
 * This follows the same "local modifications staged against remote data,
 * saved explicitly" model used elsewhere in this app - see
 * `useEventState` (`src/stores/hooks/use-event-state.ts`) and its consumer
 * `TournamentManager` (`src/apps/tournaments/tournament-manager.tsx`):
 * those keep a `remote` copy (straight from SWR) separate from a
 * `modified`/staged copy, transparently fall back to `remote` whenever
 * nothing is staged, and only push the staged copy to the server on an
 * explicit "Save" action (with a "Revert" that just drops the buffer).
 *
 * Mirrored here at the scale of a single timeline's `items` array:
 *  - `modifiedItems` starts `null` ("nothing staged"). While it is `null`,
 *    `items` mirrors `remoteTimeline.items` directly, the same way
 *    `useEventState` mirrors `eventRequest.data`/`mergeWithTarget(...)`
 *    output whenever its own modified-atom is empty.
 *  - The first mutator call (`reorder`/`updateItem`/`addItem`/`removeItem`/
 *    `duplicateItem`) turns `modifiedItems` into a real array; from then on
 *    IT is the source of truth for `items` (`isDirty` becomes true), and it
 *    survives switching `selectedItemId` around within the same timeline -
 *    only switching to a *different* timeline resets the buffer, since at
 *    that point there is a different timeline's items to stage.
 *  - `save()` PATCHes the staged items, `mutate()`s the timelines SWR
 *    cache, then clears the buffer. `revert()` just clears the buffer,
 *    snapping `items` back to whatever is on the server.
 */
export const useTimelineEditor = (
  eventKey: string | null | undefined,
  timelineId: string | null
): UseTimelineEditorResult => {
  const { data: timelines, mutate } = useTimelines(eventKey);

  const remoteTimeline =
    timelines?.find((t) => t.timelineId === timelineId) ?? null;

  const [modifiedItems, setModifiedItems] = useState<GraphicSpec[] | null>(
    null
  );
  const [modifiedVariables, setModifiedVariables] = useState<
    TemplateVariable[] | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);

  // Switching to a DIFFERENT timeline starts a fresh buffer. Switching
  // which ITEM is selected for editing within the same timeline must NOT
  // reset it, so this effect only keys off `timelineId`.
  const bufferTimelineId = useRef<string | null>(timelineId);
  useEffect(() => {
    if (bufferTimelineId.current !== timelineId) {
      bufferTimelineId.current = timelineId;
      setModifiedItems(null);
      setModifiedVariables(null);
    }
  }, [timelineId]);

  const items = modifiedItems ?? remoteTimeline?.items ?? [];
  // The merged view described on `timeline` above - staged variables (if
  // any) overlaid onto the last-known-remote timeline. Only variables are
  // merged here; `items` stays the separate accessor above so existing
  // consumers of `items` are untouched.
  const timeline: Timeline | null = remoteTimeline
    ? modifiedVariables !== null
      ? { ...remoteTimeline, variables: modifiedVariables }
      : remoteTimeline
    : null;
  const isDirty = modifiedItems !== null || modifiedVariables !== null;

  const reorder = useCallback((next: GraphicSpec[]) => {
    setModifiedItems(next);
  }, []);

  const updateItem = useCallback(
    (id: string, patch: Partial<GraphicSpec>) => {
      setModifiedItems((prev) => {
        const base = prev ?? remoteTimeline?.items ?? [];
        return base.map((it) => (it.id === id ? { ...it, ...patch } : it));
      });
    },
    [remoteTimeline]
  );

  const addItem = useCallback(
    (item: GraphicSpec) => {
      setModifiedItems((prev) => {
        const base = prev ?? remoteTimeline?.items ?? [];
        return [...base, item];
      });
    },
    [remoteTimeline]
  );

  const removeItem = useCallback(
    (id: string) => {
      setModifiedItems((prev) => {
        const base = prev ?? remoteTimeline?.items ?? [];
        return base.filter((it) => it.id !== id);
      });
    },
    [remoteTimeline]
  );

  // Duplicating an item must mint a FRESH id. `timeline-items.tsx` keys its
  // `@dnd-kit/sortable` rows by `item.id` (both in `SortableContext`'s
  // `items` list and each row's `useSortable({ id: item.id })`) and
  // `selectedItemId` selection is also tracked by id - a copy sharing its
  // source's id would collide with both.
  const duplicateItem = useCallback(
    (id: string) => {
      setModifiedItems((prev) => {
        const base = prev ?? remoteTimeline?.items ?? [];
        const index = base.findIndex((it) => it.id === id);
        if (index === -1) return base;
        const copy: GraphicSpec = { ...base[index], id: crypto.randomUUID() };
        return [...base.slice(0, index + 1), copy, ...base.slice(index + 1)];
      });
    },
    [remoteTimeline]
  );

  // Follows the exact same staged-edit shape as `reorder` above: the whole
  // next array replaces the buffer wholesale (the caller - `VariableEditor`
  // in the graphics controller - always emits a complete next array, never
  // a partial patch), and this is the first mutator call that turns
  // `modifiedVariables` from `null` into a real (possibly empty) array.
  const setVariables = useCallback((next: TemplateVariable[]) => {
    setModifiedVariables(next);
  }, []);

  const revert = useCallback(() => {
    setModifiedItems(null);
    setModifiedVariables(null);
  }, []);

  const save = useCallback(async () => {
    if (!eventKey || !timelineId || !remoteTimeline) return;
    if (modifiedItems === null && modifiedVariables === null) return;
    setIsSaving(true);
    try {
      // Built as a plain (non-`TimelinePatch`-annotated) object so an
      // included `variables` key is not excess-property-checked against
      // `TimelinePatch` (which does not yet declare that field - see the
      // report on this change). Only the fields actually staged are sent.
      const patch = {
        ...(modifiedItems !== null ? { items: modifiedItems } : {}),
        ...(modifiedVariables !== null ? { variables: modifiedVariables } : {})
      };
      // `remoteTimeline.revision` is the optimistic-concurrency token the
      // PATCH requires - the server rejects a save whose `expectedRevision`
      // doesn't match the row's current `revision` with a 409.
      await graphicsApi.update.timeline(
        eventKey,
        timelineId,
        patch,
        remoteTimeline.revision
      );
      await mutate();
      setModifiedItems(null);
      setModifiedVariables(null);
    } finally {
      setIsSaving(false);
    }
  }, [
    eventKey,
    timelineId,
    remoteTimeline,
    modifiedItems,
    modifiedVariables,
    mutate
  ]);

  return {
    timeline,
    items,
    isDirty,
    isSaving,
    save,
    revert,
    reorder,
    updateItem,
    addItem,
    removeItem,
    duplicateItem,
    setVariables
  };
};
