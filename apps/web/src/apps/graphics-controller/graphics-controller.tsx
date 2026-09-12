import {
  CloudUploadOutlined,
  LeftOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RightOutlined,
  StopOutlined
} from '@ant-design/icons';
import type {
  GraphicSpec,
  TemplateVariable,
  Timeline,
  VariableValues,
  VizFrame
} from '@toa-lib/models';
import {
  AudienceScreens,
  isTemplatedTimeline,
  timelineBoundVariables
} from '@toa-lib/models';
import {
  Alert,
  Button,
  type ButtonProps,
  Col,
  Divider,
  Row,
  Select,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography
} from 'antd';
import dayjs from 'dayjs';
import { useAtomValue } from 'jotai';
import { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { graphicsApi, useTimelines } from 'src/api/use-graphics-data.js';
import { useSocketWorker } from 'src/api/use-socket-worker.js';
import { useStatsCatalogue } from 'src/api/use-stats-data.js';
import { MoreButton } from 'src/components/buttons/more-button.js';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { eventKeyAtom } from 'src/stores/state/index.js';
import { liveGraphicStateAtom } from 'src/stores/state/graphics.js';
import { CueQueueList, type CueQueueRowInfo } from './cue-queue.js';
import { LiveMonitor } from './live-monitor.js';
import { QuickStatDrawer } from './quick-stat-drawer.js';
import { TimelineItemsPanel } from './timeline-items-panel.js';
import { TimelineList } from './timeline-list.js';
import { useCue } from './use-cue.js';
import { useCueQueue } from './use-cue-queue.js';
import { useQueueRowRefresh } from './use-queue-row-refresh.js';
import { useTimelineEditor } from './use-timeline-editor.js';
import { VariableFillModal } from './variable-fill-modal.js';

/**
 * Producer control surface for live broadcast stats graphics.
 *
 * Assembles already-built pieces (`TimelineList`, `TimelineItemsPanel`,
 * `QuickStatDrawer`, `useTimelineEditor`, `LiveMonitor`, `useCue`,
 * `CueQueueList`, `useCueQueue`, `VariableFillModal`) into the layout
 * described in the design brief: an ACTIVE/transport bar on top, then a
 * tabbed working area below it, and the live monitor pinned to the
 * bottom-left at all times.
 *
 * The working area is two tabs sharing one always-visible Quick Stat column:
 *  - "Editor" - the timeline list plus the item/inspector panel for whichever
 *    timeline the producer has selected there.
 *  - "Live" - the "Timeline Queue" (`CueQueueList`, renamed in the UI) on the
 *    left, and the same item/inspector panel on the right, bound to the
 *    timeline currently cued to the transport (`liveState.timelineId`).
 *    Edits made here hit the real cued timeline the instant they are saved;
 *    this is deliberate (see the warning banner the tab renders). A queue
 *    row is not a picker - it has no click-to-load - its Quick Play button
 *    loads AND takes it to air in one press, and Delete removes it.
 * Each tab keeps its own `useTimelineEditor` staged buffer, so switching tabs
 * never discards in-progress edits, and Save/Revert always act on the tab
 * that is showing.
 *
 * DATA FRESHNESS: this component never fetches stat DATA on its own - every
 * `useCue` call (`cue`/`recalculate`) below is wired directly to a click
 * handler (`handleCueOrRecalculate`, `handleSendToAir`), never to an effect,
 * a selection-change, or a timer. Selecting a timeline, selecting an item
 * for editing, and moving the transport index are all cheap client-side
 * state changes with no network request attached. The cue queue follows the
 * same rule: entries are only ever queried/cued through an explicit
 * "Cue"/"Recalculate"/"Quick Play"/"Push" action - enqueuing or reordering a
 * queue entry never itself triggers a stats query.
 */

/** A single modal instance serves two distinct producer actions - since only
 * one can ever be open at once. */
type VariableModalState =
  | {
      kind: 'enqueue-timeline';
      timelineId: string;
      variables: TemplateVariable[];
    }
  | { kind: 'cue-spec'; spec: GraphicSpec; variables: TemplateVariable[] };

/** Distinct variable names a spec's selectors are bound to, deduplicated. */
function boundVariableNames(spec: GraphicSpec): string[] {
  if (!spec.bindings) return [];
  return Array.from(
    new Set(
      Object.values(spec.bindings).filter(
        (name): name is string => name !== undefined
      )
    )
  );
}

/** Short human-readable rendering of a queue entry's resolved values, e.g. "featured: 1234, opponent: 5678". */
function formatValueSummary(
  timeline: Timeline | undefined,
  values: VariableValues
): string {
  const variables = timeline?.variables ?? [];
  if (variables.length === 0) return '';
  return variables
    .map((variable) => `${variable.name}: ${values[variable.name] ?? '—'}`)
    .join(', ');
}

// Prev/Go's label changes with transport state ("Prev" / "Animate Out",
// "Next" / "Animate In" / "Animate Out and Clear") - a fixed width keeps
// both buttons from resizing (and the whole row from jumping around) as
// the label length changes. Sized for the longest label with room to spare.
const STEP_BUTTON_WIDTH = 190;

/**
 * A transport button that greys itself out - with a tooltip explaining why -
 * whenever pressing it would currently do nothing (no event, nothing loaded,
 * already at a boundary, unsaved edits, …). `reason === undefined` means the
 * action is available; any string both disables the button and is shown on
 * hover. Every transport action is a fire-and-forget REST call whose failure
 * modes are otherwise invisible, so the precondition is checked here instead.
 */
const TransportButton: FC<
  Omit<ButtonProps, 'disabled'> & { reason?: string; children?: ReactNode }
> = ({ reason, ...buttonProps }) => {
  const button = <Button {...buttonProps} disabled={reason !== undefined} />;
  return reason === undefined ? (
    button
  ) : (
    <Tooltip title={reason}>
      <span>{button}</span>
    </Tooltip>
  );
};

export const GraphicsController: FC = () => {
  const eventKey = useAtomValue(eventKeyAtom);
  const liveState = useAtomValue(liveGraphicStateAtom);
  const { events } = useSocketWorker();
  const { showSnackbar, showErrorSnackbar } = useSnackbar();

  const { data: timelines } = useTimelines(eventKey);
  // Published-only, for the Timeline Queue's "Search timelines to add…"
  // picker below - everything else on this page (queue row name lookups,
  // the Editor tab's list) keeps using the unfiltered `timelines` above.
  const { data: publishedTimelines } = useTimelines(eventKey, true);
  const { data: catalogue = [] } = useStatsCatalogue(eventKey);

  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(
    null
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [liveSelectedItemId, setLiveSelectedItemId] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<'editor' | 'live'>('editor');
  const [variableModal, setVariableModal] = useState<VariableModalState | null>(
    null
  );

  // One buffer for the producer's hand-picked timeline (Editor tab) and a
  // separate one for whatever is cued to the transport (Live tab). They are
  // distinct hooks so each tab's staged edits survive switching away and
  // back; if both happen to point at the same timeline, the first save wins
  // and the second gets a 409 (optimistic-concurrency) it surfaces normally.
  const editor = useTimelineEditor(eventKey, selectedTimelineId);
  const liveEditor = useTimelineEditor(eventKey, liveState.timelineId);
  const activeEditor = activeTab === 'live' ? liveEditor : editor;
  const cue = useCue(eventKey);
  const cueQueue = useCueQueue(eventKey);
  const queueRowRefresh = useQueueRowRefresh();

  // The item actually under the transport playhead, straight from
  // `liveEditor` (bound to `liveState.timelineId`) - true regardless of
  // which tab is showing or what's selected in the Editor tab.
  const activeItem =
    liveState.timelineId !== null
      ? (liveEditor.items[liveState.index] ?? null)
      : null;

  // The item selected in the LIVE tab - used as Cue/Recalculate's fallback
  // target when nothing is live yet. Deliberately `null` while on the
  // Editor tab: the Editor must never feed the ACTIVE bar/Cue-Recalculate,
  // so selecting an item there cannot change what "Nothing cued" shows or
  // what Cue would act on - only a Live-tab selection, or the true live
  // item, can.
  const activeSelectedItem =
    activeTab === 'live'
      ? (liveEditor.items.find((i) => i.id === liveSelectedItemId) ?? null)
      : null;

  // What "Cue"/"Recalculate" acts on: the item currently under the
  // transport playhead when a timeline is loaded, else whatever the
  // producer has selected in the Live tab's items list.
  const cueTarget = activeItem ?? activeSelectedItem;
  const isCuedForTarget =
    !!cueTarget &&
    (cue.active?.spec.id === cueTarget.id ||
      cue.activeUnavailable?.spec.id === cueTarget.id);

  // Per-entry display info for the queue list - joins each entry to its
  // timeline's current name/variables. An entry whose `timelineId` no
  // longer matches any timeline is marked `missing` rather than dropped
  // (the persisted queue keeps it - see `use-cue-queue.ts`).
  const queueRowInfo = useMemo<Record<string, CueQueueRowInfo>>(() => {
    const info: Record<string, CueQueueRowInfo> = {};
    for (const entry of cueQueue.entries) {
      const timeline = timelines?.find(
        (t) => t.timelineId === entry.timelineId
      );
      info[entry.entryId] = {
        timelineName: timeline?.name ?? entry.timelineId,
        valueSummary: formatValueSummary(timeline, entry.values),
        missing: !timeline
      };
    }
    return info;
  }, [cueQueue.entries, timelines]);

  // Auto-warms the FIRST queue entry's stat data as soon as it becomes On
  // Deck (position 1) - whether that's because the show just started, the
  // previous On Deck entry was taken/removed, or the producer reordered the
  // queue. Purely a stats-cache warm (see `use-queue-row-refresh.ts`) -
  // never touches the live transport, so it's safe to fire regardless of
  // what else is on air. `refreshedOnDeckRef` fires this once per
  // PROMOTION (keyed by entryId), not on every render the same entry
  // happens to still be on deck for - the row's own Refresh icon covers
  // "it's been sitting a while, refresh it again".
  const onDeckEntryId = cueQueue.entries[0]?.entryId ?? null;
  const refreshedOnDeckRef = useRef<string | null>(null);
  useEffect(() => {
    if (!eventKey || !onDeckEntryId) return;
    if (refreshedOnDeckRef.current === onDeckEntryId) return;
    refreshedOnDeckRef.current = onDeckEntryId;
    const entry = cueQueue.entries.find((e) => e.entryId === onDeckEntryId);
    if (!entry) return;
    const timeline = timelines?.find((t) => t.timelineId === entry.timelineId);
    void queueRowRefresh.refreshEntry(eventKey, entry, timeline);
  }, [eventKey, onDeckEntryId, cueQueue.entries, timelines, queueRowRefresh]);

  const handleRefreshQueueEntry = (entryId: string) => {
    if (!eventKey) return;
    const entry = cueQueue.entries.find((e) => e.entryId === entryId);
    if (!entry) return;
    const timeline = timelines?.find((t) => t.timelineId === entry.timelineId);
    void queueRowRefresh.refreshEntry(eventKey, entry, timeline);
  };

  // While `liveState.armed` is true, the transport has already auto-rolled
  // onto the next queued entry and is holding it - the next press performs
  // the take. Named here so both the ACTIVE bar and the queue header can
  // point at the same entry.
  const armedEntryInfo =
    liveState.armed && liveState.queueEntryId
      ? queueRowInfo[liveState.queueEntryId]
      : undefined;

  // ------------------------------------------------------------------
  // Transport availability. `state.loaded` on the server holds the SAVED
  // items of whatever timeline is on the transport - never the dirty
  // editor buffer - so every button below is judged against that, and
  // disabled (with a reason) when pressing it would 4xx or no-op.
  //
  // Prev/Go are the only two step actions left (Take/Next were retired -
  // see `handlePrev`/`handleGo`): each one BOTH moves the cue pointer and
  // takes the result to air in a single press, so pressing one always
  // produces a visible transition, never a silent cue-only step.
  //
  // Every real item sits between two THEORETICAL boundary slots that are
  // never actual `LoadedGraphicsSnapshot` indices - "0" before the first
  // item and "n+1" after the last - which is why Prev/Go stay enabled AT
  // the first/last item instead of disabling there: pressing Prev on item 1
  // steps onto "0" (animate out - see `handlePrev`), and pressing Go on the
  // last item steps onto "n+1" (animate out AND clear, advancing the
  // Timeline Queue - see `handleGo`/`handleClearAndAdvanceQueue`).
  // ------------------------------------------------------------------
  const loadedTimeline = liveState.timelineId
    ? (timelines?.find((t) => t.timelineId === liveState.timelineId) ?? null)
    : null;
  const loadedItemCount = loadedTimeline?.items.length ?? 0;
  const isAtFirstItem = liveState.index <= 0;
  const isAtLastItem =
    loadedItemCount > 0 && liveState.index >= loadedItemCount - 1;

  // ATEM-style Program/Preview border for the transport box (see the JSX
  // below): RED only while something is genuinely animated in (on air) -
  // never merely because the Timeline Queue has entries waiting. GREEN
  // while a timeline is loaded but not yet taken (the "on deck"/"0" state -
  // e.g. right after the idle-queue effect auto-pulls one in). Neither
  // color once nothing is loaded at all.
  const transportOnAir = liveState.onAir;
  const transportOnDeck = !liveState.onAir && liveState.timelineId !== null;

  const noEventReason = !eventKey ? 'No event is loaded.' : undefined;
  const notLoadedReason = !liveState.timelineId
    ? 'Load a timeline to the transport first.'
    : undefined;

  // Prev is disabled ONLY in the one case where it would be a genuine no-op:
  // sitting at item 1 with nothing animated in yet - there is no "before
  // this" to step back to, and re-hiding an already-hidden graphic changes
  // nothing. Everywhere else (including item 1 while ON air, where it
  // animates out) it's a real action.
  const prevDisabledReason =
    noEventReason ??
    notLoadedReason ??
    (isAtFirstItem && !liveState.onAir
      ? 'Already animated out - nothing to step back to.'
      : undefined);
  const goDisabledReason = noEventReason ?? notLoadedReason;

  // Labels track exactly what pressing the button will do (see `handlePrev`/
  // `handleGo`): Prev only ever says "Animate Out" at the boundary where
  // that's literally its effect; Next prioritizes "Animate Out and Clear"
  // (the last-item boundary) over "Animate In" (any other off-air moment)
  // over the plain "Next" step.
  const prevLabel = isAtFirstItem && liveState.onAir ? 'Animate Out' : 'Prev';
  // Off-air takes priority: `handleGo` always just takes the current cue
  // in that state (see below), even at the last item, so the label must
  // say "Animate In" there too rather than promising a clear+advance that
  // won't happen until this item has actually been taken at least once.
  const goLabel = !liveState.onAir
    ? 'Animate In'
    : isAtLastItem
      ? 'Animate Out and Clear'
      : 'Next';

  const hideDisabledReason =
    noEventReason ??
    (!liveState.onAir ? 'Nothing is on air to hide.' : undefined);

  // Unlike Hide, this one is worth pressing even with nothing on air - it
  // also advances the Timeline Queue (see `handleClearAndAdvanceQueue`) -
  // so it's only disabled when there is truly nothing anywhere to act on.
  const clearDisabledReason =
    noEventReason ??
    (!liveState.onAir &&
    !liveState.timelineId &&
    cueQueue.entries.length === 0 &&
    !cue.active &&
    !cue.activeUnavailable
      ? 'Nothing to clear.'
      : undefined);

  const cueDisabledReason =
    noEventReason ??
    (!cueTarget
      ? 'Select an item in the Live tab, or put the transport on one.'
      : undefined);

  // There is nothing to replay until the preview bus actually has a graphic
  // on it - `previewSpec` is exactly what every PVW screen is showing (see
  // its doc comment on `LiveGraphicState`), so this disables in lockstep
  // with them rather than guessing from transport state.
  const replayPreviewDisabledReason =
    noEventReason ??
    (!liveState.previewSpec ? 'Nothing is in preview to replay.' : undefined);

  const emitPreview = (spec: GraphicSpec, frame: VizFrame) => {
    events.graphicsPreview({ spec, frame });
  };

  // Selecting a timeline in the Editor tab is PURELY a client-side choice of
  // what to edit - it must never touch the live transport. This used to also
  // `graphicsApi.live.load()` the timeline (so "open it in the Editor" and
  // "put it on the transport" were the same click), which made the Editor
  // tab a second, confusing way to change what's live. The Timeline Queue
  // (in the Live tab) is now the only path onto the transport - see
  // `pullOnDeckEntry`/`handleQuickPlayQueueEntry`.
  const handleSelectTimeline = (id: string) => {
    setSelectedTimelineId(id);
    setSelectedItemId(null);
    setVariableModal(null);
    cue.reset();
  };

  const handleCueOrRecalculate = async () => {
    if (!cueTarget) return;
    try {
      if (isCuedForTarget) {
        await cue.recalculate();
        return;
      }
      const bindingNames = boundVariableNames(cueTarget);
      if (bindingNames.length > 0) {
        // The live item is already resolved with known values (it was
        // loaded via a queue entry, or is being re-cued after a Save) -
        // reuse them automatically rather than prompting. The producer
        // already filled these in once; re-prompting mid-show would be a
        // serious usability failure.
        //
        // Read from `liveState.values` - the server's own record of what
        // resolved THIS load (mirrors `LoadedGraphicsSnapshot.values`) -
        // rather than trying to reconstruct it from `cueQueue.entries`:
        // that queue entry is normally already gone by the time this runs
        // (`pullOnDeckEntry`/`handleQuickPlayQueueEntry` both remove it
        // immediately after loading), so that lookup used to fail here
        // every time and fall through to the modal below despite the
        // values already being known and in effect on air.
        const queuedValues =
          cueTarget === activeItem ? (liveState.values ?? undefined) : undefined;
        if (queuedValues) {
          const result = await cue.cue(cueTarget, queuedValues);
          if (result) emitPreview(result.spec, result.frame);
          return;
        }
        // No known values for this spec's bindings - prompt for only the
        // variables it actually references.
        const variables = (editor.timeline?.variables ?? []).filter((v) =>
          bindingNames.includes(v.name)
        );
        setVariableModal({ kind: 'cue-spec', spec: cueTarget, variables });
        return;
      }
      const result = await cue.cue(cueTarget);
      if (result) emitPreview(result.spec, result.frame);
    } catch (e) {
      showErrorSnackbar('Error while querying stat data.', e);
    }
  };

  const handlePush = () => {
    const result = cue.push();
    if (result) emitPreview(result.spec, result.frame);
  };

  // Kicks off a fresh recalculation for whatever just became the CUE and,
  // if it resolves before the operator takes it to air, silently lands it -
  // `refresh`+`pushUpdate` targeting 'cue' can only ever write `state.cue`,
  // never `state.program` (see `PlaybackRefresh.ts`'s own contract), so this
  // can never disturb what's currently on air; it just means the item shows
  // the newest data whenever it IS eventually animated in. Fire-and-forget:
  // a lost race (the operator already moved the transport on, or took it
  // live before this resolved) rejects SUPERSEDED/NOT_READY, which is a
  // normal, silent outcome here - this is a best-effort background refresh,
  // never a producer-facing action.
  const refreshCueSilently = (key: string) => {
    void (async () => {
      try {
        await graphicsApi.live.refresh(key, 'cue');
        await graphicsApi.live.pushUpdate(key);
      } catch {
        // Expected races and transient failures both fall through here.
      }
    })();
  };

  // Pulls the Timeline Queue's On Deck entry (position 1) onto the
  // transport and removes it from the queue. The ONE place "advance the
  // timeline queue" happens - used explicitly by
  // `handleClearAndAdvanceQueue` and automatically by the idle-queue effect
  // below. Passes the entry's own bound `values` through to `load` so a
  // templated entry's bindings actually resolve - `handleEnqueueTimeline`
  // already collects these via the variable-fill modal before the entry
  // is ever queued.
  const pullOnDeckEntry = async () => {
    if (!eventKey) return;
    const [onDeck] = cueQueue.entries;
    if (!onDeck) return;
    try {
      await graphicsApi.live.load(eventKey, onDeck.timelineId, onDeck.values);
      refreshCueSilently(eventKey);
      await cueQueue.removeEntry(onDeck.entryId);
    } catch (e) {
      showErrorSnackbar('Error while advancing the timeline queue.', e);
    }
  };

  // Whenever the transport is fully idle (nothing loaded at all - not just
  // off air) and the Timeline Queue has something waiting, pull it straight
  // into the controller: loaded, but deliberately NOT taken to air. Fires
  // once per idle-then-queued transition - once `pullOnDeckEntry` succeeds,
  // `liveState.timelineId` becomes non-null and this effect's guard stops
  // it from firing again (see the broadcast fix in the realtime relay that
  // makes `liveState` actually reflect this promptly).
  useEffect(() => {
    if (!eventKey) return;
    if (liveState.timelineId !== null) return;
    if (cueQueue.entries.length === 0) return;
    void pullOnDeckEntry();
  }, [eventKey, liveState.timelineId, cueQueue.entries.length]);

  // Prev/Go replace the old four-button Prev/Go/Take/Next row. There is no
  // longer a separate cue-only step: each press moves the transport (back
  // or forward) AND takes the result to air in one action, so the button
  // always produces a visible animated transition rather than a silent
  // preview-only move. Posts the same pair of requests whether or not the
  // transport is armed - the API already treats `advance` as "perform the
  // armed take" itself while armed, so the follow-up `take` here is a
  // harmless no-op re-confirmation in that case, never a double-take of
  // something different.
  //
  // CRITICAL: while off air, both buttons act on the CURRENT index rather
  // than navigating first. `liveState.index` never itself represents the
  // theoretical "0"/"before anything" slot - it always points at a real
  // item, even the very first one - so calling `advance()`/`previous()`
  // unconditionally here would skip straight past item 1 (and its cue,
  // prepared at load time) the first time the operator ever presses
  // "Animate In", taking whatever item 2 happens to be instead - or
  // failing outright if item 2's cue never prepared successfully. "Animate
  // In"/"Animate Out" (see `prevLabel`/`goLabel` above) means exactly what
  // it says: take what's already cued right here, don't move first.
  //
  // Once on air, each one special-cases its theoretical boundary slot (see
  // the big comment above `loadedTimeline`): Prev at item 1 steps onto "0"
  // (animate out only); Go at the last item steps onto "n+1" (animate out
  // AND clear, advancing the queue) instead of asking the server to move
  // somewhere that doesn't exist.
  const handlePrev = async () => {
    if (!eventKey) return;
    try {
      if (!liveState.onAir) {
        if (isAtFirstItem) return; // guarded by prevDisabledReason too
        await graphicsApi.live.take(eventKey);
        return;
      }
      if (isAtFirstItem) {
        await graphicsApi.live.clear(eventKey);
        return;
      }
      await graphicsApi.live.previous(eventKey);
      await graphicsApi.live.take(eventKey);
    } catch (e) {
      showErrorSnackbar('Error while animating to the previous graphic.', e);
    }
  };

  const handleGo = async () => {
    if (!eventKey) return;
    try {
      if (!liveState.onAir) {
        await graphicsApi.live.take(eventKey);
        return;
      }
      if (isAtLastItem) {
        await handleClearAndAdvanceQueue();
        return;
      }
      await graphicsApi.live.advance(eventKey);
      await graphicsApi.live.take(eventKey);
    } catch (e) {
      showErrorSnackbar('Error while animating to the next graphic.', e);
    }
  };

  // Animate Out (Hide): takes the program off air (its exit animation
  // plays) without touching anything else - the cue, the transport
  // position, and the local `cue` hook's state are all left alone, so a
  // subsequent Prev/Go still resumes exactly where the show was. Also what
  // Prev does automatically at item 1 (see `handlePrev`).
  const handleHide = async () => {
    if (!eventKey) return;
    try {
      await graphicsApi.live.clear(eventKey);
    } catch (e) {
      showErrorSnackbar('Error while hiding the graphic.', e);
    }
  };

  // Animate Out and Clear: takes the program off air, resets this tab's
  // local `cue` hook state (the Cue/Recalculate/Push row above), and
  // advances the Timeline Queue - loading the On Deck entry if one exists,
  // or fully unloading the transport (`live/unload`) if the queue is empty
  // so it goes genuinely idle rather than leaving the just-cleared show
  // sitting there as "loaded". Also what Go does automatically at the last
  // item (see `handleGo`).
  const handleClearAndAdvanceQueue = async () => {
    if (!eventKey) return;
    try {
      await graphicsApi.live.clear(eventKey);
      cue.reset();
      if (cueQueue.entries.length > 0) {
        await pullOnDeckEntry();
      } else {
        await graphicsApi.live.unload(eventKey);
      }
    } catch (e) {
      showErrorSnackbar('Error while clearing and advancing the queue.', e);
    }
  };

  // Replays the entrance animation on every preview (PVW) screen, so the
  // producer can see how the next graphic will animate in before committing
  // it to air. Deliberately touches nothing else: no data is re-queried (the
  // preview already holds its frame), no transport state moves, and the
  // program bus is untouched - re-animating something already on air would
  // be a visible glitch to the audience.
  const handleReplayPreview = async () => {
    if (!eventKey) return;
    try {
      await graphicsApi.live.replayPreview(eventKey);
    } catch (e) {
      showErrorSnackbar('Error while replaying the preview transition.', e);
    }
  };

  const handleQuickStatPreview = async (spec: GraphicSpec) => {
    if (!eventKey) return;
    try {
      const result = await cue.cue(spec);
      if (result) emitPreview(result.spec, result.frame);
    } catch (e) {
      showErrorSnackbar('Error while previewing quick stat.', e);
    }
  };

  const handleQuickStatCue = async (spec: GraphicSpec) => {
    if (!eventKey) return;
    try {
      const result = await cue.cue(spec);
      if (result) emitPreview(result.spec, result.frame);
    } catch (e) {
      showErrorSnackbar('Error while cueing quick stat.', e);
    }
  };

  const handleQuickStatTakeNow = async (spec: GraphicSpec) => {
    if (!eventKey) return;
    try {
      const result = await cue.cue(spec);
      if (!result) return; // A 422 "unavailable" outcome - surfaced in the ACTIVE bar, never sent to air.
      emitPreview(result.spec, result.frame);
      await graphicsApi.live.take(eventKey);
    } catch (e) {
      showErrorSnackbar('Error while sending graphic to air.', e);
    }
  };

  // Quick Stat's "Add to timeline" follows the visible tab: on Live it
  // appends straight to the cued timeline's buffer, on Editor to the
  // hand-selected one.
  const handleAppendToTimeline = (spec: GraphicSpec) => {
    if (activeTab === 'live') {
      if (!liveEditor.timeline) {
        showSnackbar('No timeline is cued to the transport.');
        return;
      }
      liveEditor.addItem(spec);
      return;
    }
    if (!selectedTimelineId) {
      showSnackbar('Select or create a timeline first.');
      return;
    }
    editor.addItem(spec);
  };

  const handleSaveTimeline = async () => {
    try {
      await activeEditor.save();
    } catch (e) {
      showErrorSnackbar('Error while saving timeline.', e);
      return;
    }
    // Only the LIVE tab's save is allowed to touch the transport - it is
    // by definition editing the timeline that's cued there, and the
    // transport's loaded snapshot is the pre-save item list until reloaded,
    // so Prev/Go would otherwise drift from what was just saved. An Editor
    // tab save must NEVER call a `live/*` endpoint, even when the timeline
    // being edited there happens to also be the live one right now - the
    // Editor is purely a client-side editing surface.
    if (activeTab === 'live' && eventKey && liveState.timelineId) {
      try {
        await graphicsApi.live.load(eventKey, liveState.timelineId);
        showSnackbar('Timeline saved and reloaded to the transport.');
      } catch (e) {
        showErrorSnackbar(
          'Timeline saved, but reloading it to the transport failed.',
          e
        );
      }
    } else {
      showSnackbar('Timeline saved.');
    }
  };

  // --------------------------------------------------------------------
  // Cue queue flows (Change 4).
  // --------------------------------------------------------------------

  // Adds a timeline to the queue by id - the target of the Timeline Queue's
  // search/typeahead field, so any saved timeline can be queued regardless
  // of what's selected in the Editor tab. A templated timeline can't be
  // queued with unfilled bindings, so it opens the variable-fill modal
  // first; `handleVariableModalSubmit` finishes the add once submitted.
  const handleEnqueueTimeline = (timelineId: string) => {
    const timeline = timelines?.find((t) => t.timelineId === timelineId);
    if (!timeline) return;
    if (isTemplatedTimeline(timeline)) {
      const names = timelineBoundVariables(timeline);
      const variables = (timeline.variables ?? []).filter((v) =>
        names.includes(v.name)
      );
      setVariableModal({
        kind: 'enqueue-timeline',
        timelineId: timeline.timelineId,
        variables
      });
    } else {
      cueQueue.addEntry(timeline.timelineId, {}).catch((e) => {
        showErrorSnackbar('Error while adding to the cue queue.', e);
      });
    }
  };

  // Quick Play: loads the queue entry's OWN timeline onto the transport
  // (not `queueGo`/`go`, which jumps by item index WITHIN whatever is
  // already loaded - meaningless for an entry pointing at a different
  // timeline), then takes it to air immediately. The existing Take
  // pipeline (see `PlaybackProgram` / the audience display's transition
  // machine) handles animating the current graphic out and this one in,
  // exactly as pressing Take would. Consumes the entry from the queue,
  // same as `pullOnDeckEntry` - it's gone once it's played. There is
  // deliberately no "load only" row action any more - the row's one button
  // either puts this on air now or does nothing at all.
  const handleQuickPlayQueueEntry = async (entryId: string) => {
    if (!eventKey) return;
    const entry = cueQueue.entries.find((e) => e.entryId === entryId);
    if (!entry) return;
    try {
      await graphicsApi.live.load(eventKey, entry.timelineId, entry.values);
      refreshCueSilently(eventKey);
      await graphicsApi.live.take(eventKey);
      await cueQueue.removeEntry(entry.entryId);
    } catch (e) {
      showErrorSnackbar('Error while taking the queued timeline to air.', e);
    }
  };

  // Opens the audience display "pinned" to the stats-graphics PGM or PVW bus
  // in its own window - the same `?pin=` mechanism `DisplaySwitcher` already
  // reads (see `display-switcher.tsx`), just launched outside this tab so a
  // producer can drag it to a second monitor/output.
  const handleOpenPinnedDisplay = (screen: AudienceScreens) => {
    if (!eventKey) return;
    window.open(
      `/${eventKey}/audience?pin=${screen}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleVariableModalSubmit = async (values: VariableValues) => {
    const modal = variableModal;
    setVariableModal(null);
    if (!modal) return;
    try {
      if (modal.kind === 'enqueue-timeline') {
        await cueQueue.addEntry(modal.timelineId, values);
      } else {
        const result = await cue.cue(modal.spec, values);
        if (result) emitPreview(result.spec, result.frame);
      }
    } catch (e) {
      showErrorSnackbar(
        modal.kind === 'cue-spec'
          ? 'Error while querying stat data.'
          : 'Error while adding to the cue queue.',
        e
      );
    }
  };

  const cueBusy = cue.isCueing || cue.isRecalculating;
  const asOf = cue.active
    ? dayjs(cue.active.calculatedAsOfUtc).format('HH:mm')
    : null;

  return (
    <PaperLayout
      containerWidth='100%'
      header={
        <TwoColumnHeader
          left={
            <Typography.Title level={3} style={{ margin: 0 }}>
              Graphics Controller
            </Typography.Title>
          }
          right={
            <MoreButton
              menuItems={[
                {
                  key: 'save',
                  label: (
                    <a onClick={handleSaveTimeline}>
                      Save {activeTab === 'live' ? 'Live ' : ''}Timeline
                      {activeEditor.isDirty ? ' *' : ''}
                    </a>
                  ),
                  disabled: !activeEditor.isDirty || activeEditor.isSaving
                },
                {
                  key: 'revert',
                  label: (
                    <a onClick={activeEditor.revert}>
                      Revert {activeTab === 'live' ? 'Live ' : ''}Timeline
                      Changes
                    </a>
                  ),
                  disabled: !activeEditor.isDirty
                },
                { type: 'divider' },
                {
                  key: 'open-program',
                  label: (
                    <a
                      onClick={() =>
                        handleOpenPinnedDisplay(AudienceScreens.STATS)
                      }
                    >
                      Open Program in New Window
                    </a>
                  ),
                  disabled: !eventKey
                },
                {
                  key: 'open-preview',
                  label: (
                    <a
                      onClick={() =>
                        handleOpenPinnedDisplay(AudienceScreens.STATS_PREVIEW)
                      }
                    >
                      Open Preview in New Window
                    </a>
                  ),
                  disabled: !eventKey
                }
              ]}
            />
          }
        />
      }
      showSettings
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          paddingBottom: 220,
          minHeight: 0,
          overflowX: 'hidden'
        }}
      >
        {/* ---------------------------------------------------------------- */}
        {/* Transport control box - the ACTIVE bar + transport buttons. The  */}
        {/* Timeline Queue used to share this box; it now lives in the Live */}
        {/* tab, to the left of the live item/inspector panel.              */}
        {/* ATEM-style Program/Preview border: red while `transportOnAir`,   */}
        {/* green while `transportOnDeck` (loaded but not yet taken) -       */}
        {/* mirroring the Timeline Queue's own red/green live-row colors     */}
        {/* (`timeline-items.tsx`) and its green On Deck row                 */}
        {/* (`cue-queue.tsx`).                                               */}
        {/* ---------------------------------------------------------------- */}
        <div
          role='region'
          aria-label='Graphics transport controls'
          style={{
            border: transportOnAir
              ? '2px solid var(--ant-color-error)'
              : transportOnDeck
                ? '2px solid var(--ant-color-success)'
                : '1px solid var(--ant-color-border)',
            borderRadius: 8,
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            minWidth: 0
          }}
        >
          <Row justify='space-between' align='middle' wrap>
            <Col>
              <Space size={8} wrap>
                <Tag color='red'>ACTIVE</Tag>
                <Typography.Text strong>
                  {liveEditor.timeline && activeItem
                    ? `${liveEditor.timeline.name} > ${
                        liveState.onAir
                          ? `item ${liveState.index + 1}/${liveEditor.items.length}`
                          : `Animated Out (${liveState.index + 1}/${liveEditor.items.length})`
                      }`
                    : (cueTarget?.title ?? 'Nothing cued')}
                </Typography.Text>
                {cue.active?.cache === 'stale' && (
                  <Tag color='warning'>stale</Tag>
                )}
                {cue.active?.refreshQueued && (
                  <Tag color='processing'>refresh queued</Tag>
                )}
                {cue.active?.quality === 'best_effort' && (
                  <Tag color='gold'>best effort</Tag>
                )}
                {!!cue.active?.warnings.length && (
                  <Tag color='orange'>
                    {cue.active.warnings.length} warning(s)
                  </Tag>
                )}
                {liveState.armed && (
                  <Tag color='processing'>
                    ARMED
                    {armedEntryInfo ? ` - ${armedEntryInfo.timelineName}` : ''}
                  </Tag>
                )}
              </Space>
            </Col>
          </Row>

          {cue.activeUnavailable && (
            <Alert
              type='warning'
              showIcon
              message={`${cue.activeUnavailable.status.replace('_', ' ')}: ${cue.activeUnavailable.reason}`}
            />
          )}

          <Row justify='space-between' align='middle' wrap>
            <Col>
              <Space
                size={8}
                split={<Divider type='vertical' style={{ margin: 0 }} />}
              >
                <Space size={8}>
                  <TransportButton
                    icon={<LeftOutlined />}
                    onClick={handlePrev}
                    reason={prevDisabledReason}
                    style={{ width: STEP_BUTTON_WIDTH }}
                  >
                    {prevLabel}
                  </TransportButton>
                  <TransportButton
                    icon={<RightOutlined />}
                    onClick={handleGo}
                    reason={goDisabledReason}
                    style={{ width: STEP_BUTTON_WIDTH }}
                  >
                    {goLabel}
                  </TransportButton>
                </Space>
                <Space size={8}>
                  <TransportButton
                    danger
                    icon={<StopOutlined />}
                    onClick={handleHide}
                    reason={hideDisabledReason}
                  >
                    Animate Out (Hide)
                  </TransportButton>
                  <TransportButton
                    danger
                    icon={<StopOutlined />}
                    onClick={handleClearAndAdvanceQueue}
                    reason={clearDisabledReason}
                  >
                    Animate Out and Clear
                  </TransportButton>
                </Space>
                <Space size={8}>
                  <TransportButton
                    icon={<ReloadOutlined />}
                    loading={cueBusy}
                    reason={cueBusy ? undefined : cueDisabledReason}
                    onClick={handleCueOrRecalculate}
                  >
                    Refresh Data
                  </TransportButton>
                  {cue.active && (
                    <Typography.Text type='secondary'>
                      (as of {cue.active.latestPlayedMatch?.name ?? 'match —'},{' '}
                      {asOf})
                    </Typography.Text>
                  )}
                </Space>
                {/* Preview-only: replays the entrance on every PVW screen so
                    the transition can be checked before it goes to air.
                    Never touches the program bus. */}
                <Space size={8}>
                  <TransportButton
                    icon={<PlayCircleOutlined />}
                    onClick={handleReplayPreview}
                    reason={replayPreviewDisabledReason}
                  >
                    Replay in Preview
                  </TransportButton>
                </Space>
              </Space>
            </Col>
            <Col>
              {(cue.pending || cue.pendingUnavailable) && (
                <Space size={8}>
                  <Tag color='blue'>
                    {cue.pending ? 'Update ready' : 'Recalculation unavailable'}
                  </Tag>
                  <Button
                    type='primary'
                    icon={<CloudUploadOutlined />}
                    onClick={handlePush}
                  >
                    Push
                  </Button>
                </Space>
              )}
            </Col>
          </Row>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Working area: [Editor | Live] tabs on the left, always-visible  */}
        {/* Quick Stat column on the right. Each tab owns its own timeline  */}
        {/* buffer; Quick Stat's actions follow whichever tab is showing.   */}
        {/* ---------------------------------------------------------------- */}
        <Row gutter={12} wrap={false} style={{ minHeight: 560 }}>
          <Col flex='auto' style={{ minWidth: 0 }}>
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as 'editor' | 'live')}
              items={[
                {
                  key: 'editor',
                  label: 'Editor',
                  children: (
                    <Row gutter={12} wrap={false} style={{ minHeight: 520 }}>
                      <Col
                        flex='220px'
                        style={{
                          borderRight: '1px solid var(--ant-color-border)'
                        }}
                      >
                        <TimelineList
                          eventKey={eventKey ?? ''}
                          selectedId={selectedTimelineId}
                          onSelect={handleSelectTimeline}
                        />
                      </Col>
                      <Col
                        flex='auto'
                        style={{ padding: '0 4px 0 12px', minWidth: 0 }}
                      >
                        <TimelineItemsPanel
                          editor={editor}
                          catalogue={catalogue}
                          // Always null: the Editor tab never reflects live
                          // state, even when it happens to have the live
                          // timeline open - no "LIVE" row highlight here.
                          liveIndex={null}
                          selectedItemId={selectedItemId}
                          onSelectItem={setSelectedItemId}
                          emptyText='Select a timeline from the list to edit its items.'
                        />
                      </Col>
                    </Row>
                  )
                },
                {
                  key: 'live',
                  label: 'Live',
                  children: (
                    <Row gutter={12} wrap={false} style={{ minHeight: 520 }}>
                      <Col
                        flex='280px'
                        style={{
                          borderRight: '1px solid var(--ant-color-border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8
                        }}
                      >
                        <Space size={8}>
                          <Typography.Text strong>
                            Timeline Queue
                          </Typography.Text>
                          {liveState.armed && (
                            <Tag color='processing'>
                              Armed
                              {armedEntryInfo
                                ? `: ${armedEntryInfo.timelineName}`
                                : ''}
                            </Tag>
                          )}
                        </Space>
                        {/* Not a picker: clicking a row does nothing.
                            Quick Play takes it to air now; Delete removes it. */}
                        <CueQueueList
                          entries={cueQueue.entries}
                          rowInfo={queueRowInfo}
                          refreshInfo={queueRowRefresh.refreshInfo}
                          loadedEntryId={liveState.queueEntryId}
                          onReorder={cueQueue.reorder}
                          onRemove={cueQueue.removeEntry}
                          onQuickPlay={handleQuickPlayQueueEntry}
                          onRefresh={handleRefreshQueueEntry}
                        />
                        {/* Search-to-add: picking a timeline here queues it
                            (prompting for template values first if it has
                            any) - it never selects/persists a value itself,
                            so the field always shows its placeholder again
                            right after. */}
                        <Select
                          showSearch
                          allowClear
                          value={null}
                          size='small'
                          style={{ width: '100%' }}
                          placeholder='Search timelines to add…'
                          disabled={!eventKey || cueQueue.isSaving}
                          optionFilterProp='label'
                          options={(publishedTimelines ?? []).map((t) => ({
                            value: t.timelineId,
                            label: t.name
                          }))}
                          onChange={(timelineId: string | undefined) => {
                            if (timelineId) handleEnqueueTimeline(timelineId);
                          }}
                        />
                      </Col>
                      <Col
                        flex='auto'
                        style={{ padding: '0 4px 0 12px', minWidth: 0 }}
                      >
                        <TimelineItemsPanel
                          editor={liveEditor}
                          catalogue={catalogue}
                          liveIndex={
                            liveEditor.timeline ? liveState.index : null
                          }
                          liveOnAir={liveState.onAir}
                          selectedItemId={liveSelectedItemId}
                          onSelectItem={setLiveSelectedItemId}
                          header={
                            liveEditor.timeline ? (
                              <Alert
                                type='warning'
                                showIcon
                                style={{ marginBottom: 12 }}
                                message={`Editing "${liveEditor.timeline.name}" - the timeline cued to the transport. Saved changes affect the live show immediately.`}
                              />
                            ) : undefined
                          }
                          emptyText='No timeline is cued to the transport. Load one from the Editor tab or Quick Play one from the Timeline Queue.'
                        />
                      </Col>
                    </Row>
                  )
                }
              ]}
            />
          </Col>
          <Col
            flex='340px'
            style={{
              borderLeft: '1px solid var(--ant-color-border)',
              paddingLeft: 12
            }}
          >
            <QuickStatDrawer
              eventKey={eventKey ?? ''}
              onPreview={handleQuickStatPreview}
              onCue={handleQuickStatCue}
              onAppendToTimeline={handleAppendToTimeline}
              onTakeNow={handleQuickStatTakeNow}
            />
          </Col>
        </Row>
      </div>

      <LiveMonitor />

      <VariableFillModal
        open={variableModal !== null}
        eventKey={eventKey ?? ''}
        variables={variableModal?.variables ?? []}
        confirmText={
          variableModal?.kind === 'cue-spec' ? 'Cue' : 'Add to queue'
        }
        onCancel={() => setVariableModal(null)}
        onSubmit={handleVariableModalSubmit}
      />
    </PaperLayout>
  );
};

export default GraphicsController;
