import type { GraphicSpec, LoadedGraphicsSnapshot } from '@toa-lib/models';

/**
 * The separation this module exists to enforce (F21).
 *
 * Two different item lists are on screen in the producer's Live tab and they
 * are NOT the same list:
 *
 *  - the LOADED SNAPSHOT (`readLoadedRunningOrder`) - the immutable running
 *    order the server copied at load time, and the one Prev/Go/Take actually
 *    step through. It is the only thing allowed to say what is on air, what
 *    is next, or where the playhead is;
 *  - the DRAFT (`useTimelineEditor`'s staged buffer) - what the producer is
 *    typing into right now. It may have rows reordered, inserted or deleted
 *    in front of the playhead, and none of that has reached the server.
 *
 * Before this module, the Live tab painted the snapshot's playhead position
 * ("LIVE", index N) onto the DRAFT rows. Delete a row above the playhead and
 * the highlight - and therefore the operator's belief about what Prev/Go will
 * air - slid onto a different graphic than the transport would actually play.
 *
 * `describeDraftSync` is the single predicate for "may the draft be decorated
 * with transport state at all". It is deliberately pure and free of React so
 * the rule can be tested directly, and it is conservative: anything short of
 * "this draft is provably the loaded running order" answers
 * `describesLoaded: false`, and the caller must strip the live highlight and
 * show the out-of-sync banner instead.
 */

export interface LoadedRunningOrderRow {
  /** Position within the loaded snapshot - what Prev/Go step through. */
  position: number;
  /** Index of this item inside its own saved timeline. */
  itemIndex: number;
  timelineId: string;
  id: string;
  title: string;
  isPlayhead: boolean;
}

export interface LoadedRunningOrder {
  snapshotId: string;
  /**
   * A 'rundown' snapshot's running order spans several timelines, so it can
   * never be rebuilt by re-loading ONE timeline - see `reloadReason`.
   */
  sourceKind: 'timeline' | 'rundown';
  index: number;
  rows: LoadedRunningOrderRow[];
  /** The row under the playhead. */
  current: LoadedRunningOrderRow | null;
  /** The timeline the playhead's item belongs to (what the Live tab edits). */
  timelineId: string | null;
  timelineName: string | null;
  /** The revision of that timeline AS LOADED - not as currently saved. */
  timelineRevision: number | null;
}

/**
 * Projects the authoritative loaded snapshot into the read-only view the
 * transport surface renders from. Never consults SWR, the editor buffer, or
 * anything else the browser can have edited under it.
 */
export function readLoadedRunningOrder(
  loaded: LoadedGraphicsSnapshot | null | undefined
): LoadedRunningOrder | null {
  if (!loaded) return null;
  const rows: LoadedRunningOrderRow[] = loaded.items.map((item, position) => ({
    position,
    itemIndex: item.itemIndex,
    timelineId: item.timelineId,
    id: item.spec.id,
    title: item.spec.title,
    isPlayhead: position === loaded.index
  }));
  const current = rows[loaded.index] ?? null;
  const timeline = current
    ? (loaded.timelines.find((t) => t.timelineId === current.timelineId) ??
      null)
    : null;
  return {
    snapshotId: loaded.snapshotId,
    sourceKind: loaded.source.kind,
    index: loaded.index,
    rows,
    current,
    timelineId: current?.timelineId ?? null,
    timelineName: timeline?.name ?? null,
    timelineRevision: timeline?.revision ?? null
  };
}

export type DraftSyncStatus =
  /** Nothing is on the transport, so there is no loaded order to disagree with. */
  | 'no-timeline'
  /** The draft provably IS the loaded running order. */
  | 'in-sync'
  /** Staged edits the server has never seen. */
  | 'unsaved-edits'
  /** Saved (by anyone) since the transport loaded, and not reloaded since. */
  | 'saved-not-reloaded'
  /** Both of the above: staged edits on top of an already-newer saved revision. */
  | 'diverged'
  /** The last save lost an optimistic-concurrency race; nothing was written. */
  | 'save-conflict';

export interface DraftSyncState {
  status: DraftSyncStatus;
  /**
   * The ONLY thing that may enable transport decoration (live row highlight,
   * on-air colour, cue-readiness badges) on the draft rows. True exclusively
   * when the draft is clean, based on the loaded revision, AND positionally
   * identical to the snapshot's rows for this timeline.
   */
  describesLoaded: boolean;
  severity: 'info' | 'warning' | 'error';
  /** Operator-facing banner text; `null` only when there is nothing to say. */
  message: string | null;
  /** `undefined` when "Reload to transport" is offerable, else why it is not. */
  reloadReason: string | undefined;
}

export interface DraftSyncInput {
  running: LoadedRunningOrder | null;
  /** Revision of the SAVED timeline the draft is staged on, or `null` while it loads. */
  remoteRevision: number | null;
  draftItems: GraphicSpec[];
  isDirty: boolean;
  /** Set once the last save came back 409; the draft was NOT written. */
  saveConflict: boolean;
}

/** The snapshot's own rows for one timeline, in that timeline's item order. */
function loadedRowsForTimeline(
  running: LoadedRunningOrder,
  timelineId: string
): LoadedRunningOrderRow[] {
  return running.rows
    .filter((row) => row.timelineId === timelineId)
    .slice()
    .sort((a, b) => a.itemIndex - b.itemIndex);
}

/**
 * Decides whether the draft on screen may be treated as the loaded running
 * order, and what to tell the operator when it may not.
 *
 * Revision equality alone is not enough, and a positional id match alone is
 * not either: an equal ordering can still carry a different title, binding or
 * spec at a newer revision, and an equal revision can still be paired with a
 * buffer that has been reordered. Both must hold, on a clean buffer.
 */
export function describeDraftSync(input: DraftSyncInput): DraftSyncState {
  const { running, remoteRevision, draftItems, isDirty, saveConflict } = input;
  const timelineId = running?.timelineId ?? null;

  if (!running || !timelineId) {
    return {
      status: 'no-timeline',
      describesLoaded: false,
      severity: 'info',
      message: null,
      reloadReason: 'Nothing is loaded on the transport.'
    };
  }

  const loadedRevision = running.timelineRevision;
  const name = running.timelineName ?? timelineId;
  // A rundown snapshot's order is several timelines deep; `live/load` of one
  // timeline would replace the whole running order with just that timeline.
  const reloadReason =
    running.sourceKind === 'rundown'
      ? 'The transport is running a rundown of several timelines; reloading one timeline would drop the rest of the running order. Re-add it from the Show Rundown instead.'
      : undefined;

  if (saveConflict) {
    return {
      status: 'save-conflict',
      describesLoaded: false,
      severity: 'error',
      message: `Another producer saved "${name}" while you were editing it. Nothing you changed was written and your draft is still here - copy anything you need out of it, then Revert to pick up their version.`,
      reloadReason
    };
  }

  const rowsHere = loadedRowsForTimeline(running, timelineId);
  const positionsMatch =
    draftItems.length === rowsHere.length &&
    draftItems.every((item, index) => item.id === rowsHere[index]?.id);
  const revisionsMatch =
    remoteRevision !== null && remoteRevision === loadedRevision;

  if (isDirty && !revisionsMatch) {
    return {
      status: 'diverged',
      describesLoaded: false,
      severity: 'error',
      message: `Unsaved edits, staged on revision ${remoteRevision ?? '?'} of "${name}" while the transport is still running revision ${loadedRevision ?? '?'}. The rows below are your draft, not the running order. Save, then Reload to transport.`,
      reloadReason
    };
  }

  if (isDirty) {
    return {
      status: 'unsaved-edits',
      describesLoaded: false,
      severity: 'warning',
      message: `Unsaved edits. The transport is still running the loaded version of "${name}" (revision ${loadedRevision ?? '?'}), so the rows below are your draft and do not say what Prev/Go will air. Save, then Reload to transport.`,
      reloadReason
    };
  }

  if (!revisionsMatch) {
    return {
      status: 'saved-not-reloaded',
      describesLoaded: false,
      severity: 'warning',
      message: `Saved as revision ${remoteRevision ?? '?'}, but the transport is still running revision ${loadedRevision ?? '?'} of "${name}". Reload to transport to put the saved running order on the transport.`,
      reloadReason
    };
  }

  if (!positionsMatch) {
    return {
      status: 'saved-not-reloaded',
      describesLoaded: false,
      severity: 'warning',
      message: `The item list below does not match the running order the transport loaded for "${name}". Reload to transport before using it to judge what will air.`,
      reloadReason
    };
  }

  return {
    status: 'in-sync',
    describesLoaded: true,
    severity: 'info',
    message: null,
    // Re-loading an already-current timeline is not a no-op: it rewinds the
    // transport to item 1 and re-prepares the cue. Never offer it as busywork.
    reloadReason:
      reloadReason ?? 'The transport is already running this saved revision.'
  };
}
