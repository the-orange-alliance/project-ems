import {
  DeleteOutlined,
  HolderOutlined,
  PlayCircleOutlined,
  SyncOutlined,
  WarningOutlined
} from '@ant-design/icons';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { RundownEntry, RundownEntryView } from '@toa-lib/models';
import { Button, Popconfirm, Space, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { CSSProperties, FC } from 'react';
import type { QueueRowRefreshInfo } from './use-queue-row-refresh.js';
import { ON_DECK } from './use-show-rundown.js';

/**
 * The refresh icon's tooltip, shared by the On Deck row and every sortable row.
 *
 * It reports what the last warm actually DID, because the old version reported
 * an attempt as a success: every item could fail and the row still said "last
 * refresh at 14:32" (F10). A warm in which nothing succeeded now says so, and
 * a partial one names the count rather than implying the whole row is warm.
 */
function refreshTooltip(info: QueueRowRefreshInfo | undefined): string {
  if (info?.fetching) return 'Refreshing…';
  if (!info) return 'Refresh (never refreshed)';
  const at = info.lastRefreshedAtUtc
    ? `last refresh at ${dayjs(info.lastRefreshedAtUtc).format('HH:mm')}`
    : 'never refreshed';
  if (info.failed > 0 && info.succeeded === 0)
    return `Refresh (last attempt failed for all ${info.failed} item${info.failed === 1 ? '' : 's'}; ${at})`;
  if (info.failed > 0)
    return `Refresh (${info.succeeded} of ${info.attempted} items refreshed, ${info.failed} failed; ${at})`;
  if (info.unavailable > 0 && info.attempted === 0)
    return `Refresh (nothing to refresh yet: ${info.unavailable} item${info.unavailable === 1 ? '' : 's'} still need values)`;
  return `Refresh (${at})`;
}

/** True when the last warm brought nothing back at all - the row is showing cold data and says so. */
function refreshFailed(info: QueueRowRefreshInfo | undefined): boolean {
  return !!info && !info.fetching && info.failed > 0 && info.succeeded === 0;
}

/**
 * Per-entry display info the parent resolves. `describeRundownEntries`
 * (`@toa-lib/models`) derives the timeline join and `status`; the parent adds
 * the value summary, which needs the timeline's variable declarations.
 */
export interface RundownRowInfo extends RundownEntryView {
  /** Human-readable resolved variable values, e.g. "featured: 1234". */
  valueSummary: string;
}

/** Used when the parent has no info for an entry yet (timelines still loading): treat it as unresolvable rather than as ready. */
function fallbackRowInfo(entry: RundownEntry): RundownRowInfo {
  return {
    entryId: entry.entryId,
    timelineId: entry.timelineId,
    timelineName: entry.timelineId,
    itemCount: 0,
    status: 'missing-timeline',
    missingValues: [],
    valueSummary: ''
  };
}

/** Short, actionable reason a row cannot be cued as written, or `null` when it can. */
function blockedReason(info: RundownRowInfo): string | null {
  switch (info.status) {
    case 'missing-timeline':
      return `Missing timeline "${info.timelineId}"`;
    case 'empty-timeline':
      return 'Timeline has no items';
    case 'missing-values':
      return `Needs a value for ${info.missingValues.join(', ')}`;
    default:
      return null;
  }
}

export interface RundownListProps {
  entries: RundownEntry[];
  /** Per-entry display info, keyed by entryId — the parent resolves timeline names. */
  rowInfo: Record<string, RundownRowInfo>;
  /** Per-entry refresh state (fetching / last-refreshed), keyed by entryId — absent means never refreshed this session. Auto-fires when a row is promoted to On Deck (see `graphics-controller.tsx`); the icon here also lets the producer trigger one manually. */
  refreshInfo: Record<string, QueueRowRefreshInfo>;
  /** entryId currently loaded on the transport, or null. */
  loadedEntryId: string | null;
  /** Emits the complete new order as entry ids — never as entry objects, so a concurrent edit to another entry's values survives the reorder. */
  onReorder: (entryIds: string[]) => void;
  onRemove: (entryId: string) => void;
  /** Takes this entry to air immediately (load + take in one press). */
  onQuickPlay: (entryId: string) => void;
  /** Manually warms this row's stat data ahead of time - the same thing that fires automatically on promotion to On Deck. */
  onRefresh: (entryId: string) => void;
  /**
   * Entries with an advance (consume + load, possibly + take) in flight.
   *
   * Their Take and Delete buttons are disabled while it runs: a second press
   * cannot start a second consume - the hook and the server both de-duplicate
   * it - but a button that still looks pressable during a live take reads as
   * "nothing happened" and invites exactly that press (F8).
   */
  pendingEntryIds: string[];
}

/** Name + resolved-values text, shared by the On Deck row and every
 * sortable row below it. */
const RowLabel: FC<{ info: RundownRowInfo }> = ({ info }) => {
  const blocked = blockedReason(info);
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <Typography.Text
        strong
        ellipsis
        type={blocked ? 'danger' : undefined}
        style={{ display: 'block' }}
      >
        {blocked && <WarningOutlined style={{ marginRight: 4 }} />}
        {info.timelineName}
      </Typography.Text>
      <Typography.Text
        type={blocked ? 'danger' : 'secondary'}
        ellipsis
        style={{ display: 'block', fontSize: 12 }}
      >
        {blocked ?? info.valueSummary}
      </Typography.Text>
    </div>
  );
};

/** Take (quick play) + Refresh + Delete, shared by the On Deck row and every
 * sortable row below it. Take is styled green/play rather than red/
 * thunderbolt - it is the everyday "run the next thing" action here, not an
 * alarming one. Refresh (`SyncOutlined`, spinning while `refresh.fetching`)
 * warms this row's stat data on demand - the same thing On Deck promotion
 * already triggers automatically (see `graphics-controller.tsx`). */
const RowActions: FC<{
  info: RundownRowInfo;
  refresh: QueueRowRefreshInfo | undefined;
  pending: boolean;
  onQuickPlay: () => void;
  onRefresh: () => void;
  onRemove: () => void;
}> = ({ info, refresh, pending, onQuickPlay, onRefresh, onRemove }) => {
  const blocked = blockedReason(info);
  return (
  <Space size={4} onClick={(e) => e.stopPropagation()}>
    <Tooltip title={pending ? 'Taking…' : (blocked ?? 'Take')}>
      <span>
        <Button
          type='text'
          size='small'
          loading={pending}
          icon={<PlayCircleOutlined />}
          style={blocked ? undefined : { color: 'var(--ant-color-success)' }}
          aria-label={`Take ${info.timelineName} to air now`}
          disabled={blocked !== null || pending}
          onClick={onQuickPlay}
        />
      </span>
    </Tooltip>
    <Tooltip title={refreshTooltip(refresh)}>
      <span>
        <Button
          type='text'
          size='small'
          danger={refreshFailed(refresh)}
          icon={<SyncOutlined spin={refresh?.fetching} />}
          aria-label={`Refresh ${info.timelineName}'s stat data`}
          disabled={info.status === 'missing-timeline' || refresh?.fetching}
          onClick={onRefresh}
        />
      </span>
    </Tooltip>
    <Popconfirm
      title='Remove this cue?'
      description='This cannot be undone.'
      okText='Remove'
      okType='danger'
      disabled={pending}
      onConfirm={onRemove}
    >
      <Button
        type='text'
        size='small'
        danger
        disabled={pending}
        icon={<DeleteOutlined />}
        aria-label={`Remove ${info.timelineName}`}
      />
    </Popconfirm>
  </Space>
  );
};

interface OnDeckRowProps {
  info: RundownRowInfo;
  refresh: QueueRowRefreshInfo | undefined;
  pending: boolean;
  isLoaded: boolean;
  onQuickPlay: () => void;
  onRefresh: () => void;
  onRemove: () => void;
}

/**
 * The single, fixed row shown above the sortable list: whatever currently
 * sits first in the queue. Not draggable and not part of the `@dnd-kit`
 * sortable context - it is always "queue position 1", however that position
 * got filled. Bordered green for the same reason an ATEM switcher's Preview
 * bus is green: this is what a Take would put on air next, as distinct from
 * the red Program-style border the transport controls box wears once
 * something is actually loaded/live (see `graphics-controller.tsx`).
 */
const OnDeckRow: FC<OnDeckRowProps> = ({
  info,
  refresh,
  pending,
  isLoaded,
  onQuickPlay,
  onRefresh,
  onRemove
}) => (
  <div
    role='option'
    aria-selected={isLoaded}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '6px 8px',
      borderRadius: 6,
      border: '2px solid var(--ant-color-success)',
      background: isLoaded
        ? 'var(--ant-color-success-bg)'
        : blockedReason(info)
          ? 'var(--ant-color-error-bg)'
          : undefined
    }}
  >
    <RowLabel info={info} />
    {isLoaded && <Tag color='success'>LOADED</Tag>}
    <RowActions
      info={info}
      refresh={refresh}
      pending={pending}
      onQuickPlay={onQuickPlay}
      onRefresh={onRefresh}
      onRemove={onRemove}
    />
  </div>
);

interface SortableRowProps {
  entry: RundownEntry;
  position: number;
  info: RundownRowInfo;
  refresh: QueueRowRefreshInfo | undefined;
  pending: boolean;
  isLoaded: boolean;
  onQuickPlay: () => void;
  onRefresh: () => void;
  onRemove: () => void;
}

/**
 * One draggable row. Drag affordance/keyboard focus lives on the handle
 * button alone (`{...attributes} {...listeners}`) rather than the whole
 * row, mirroring `timeline-items.tsx`'s `SortableRow` so the row's action
 * buttons stay independently clickable.
 *
 * The row itself has NO click handler - this is a queue to manage, not a
 * picker, and it sits right next to the live item list where an accidental
 * click-to-load would be dangerous. The explicit per-row actions are Take
 * (quick play, right now), Refresh (warm this row's stat data now - also
 * fires automatically on promotion to On Deck, see `graphics-controller.tsx`),
 * and Delete.
 */
const SortableRow: FC<SortableRowProps> = ({
  entry,
  position,
  info,
  refresh,
  pending,
  isLoaded,
  onQuickPlay,
  onRefresh,
  onRemove
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: entry.entryId });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 1 : undefined,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 6,
    border: isLoaded
      ? '1px solid var(--ant-color-success)'
      : '1px solid transparent',
    background: isLoaded
      ? 'var(--ant-color-success-bg)'
      : blockedReason(info)
        ? 'var(--ant-color-error-bg)'
        : undefined
  };

  return (
    <div ref={setNodeRef} style={style} role='option' aria-selected={isLoaded}>
      <Button
        type='text'
        size='small'
        icon={<HolderOutlined />}
        aria-label={`Reorder ${info.timelineName}`}
        style={{ cursor: 'grab', touchAction: 'none' }}
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      />
      <Typography.Text
        type='secondary'
        style={{ width: 20, textAlign: 'right', flexShrink: 0 }}
      >
        {position}
      </Typography.Text>
      <RowLabel info={info} />
      {isLoaded && <Tag color='success'>LOADED</Tag>}
      <RowActions
        info={info}
        refresh={refresh}
        pending={pending}
        onQuickPlay={onQuickPlay}
        onRefresh={onRefresh}
        onRemove={onRemove}
      />
    </div>
  );
};

/**
 * Drag-to-reorder show rundown — the ordered list of timelines a broadcast
 * producer runs in order during a show, rendered from the event's single
 * durable `Rundown` document. Fully controlled: the parent owns
 * `entries`/`rowInfo`/`loadedEntryId` and this component only emits intent
 * callbacks.
 *
 * The first entry is pulled out into a fixed "On Deck" row above the rest
 * (see `OnDeckRow`) - it is always show position 1, marked with a yellow
 * border rather than being just another row in the sortable list.
 *
 * An entry the show cannot cue as written - deleted timeline, empty timeline,
 * a declared variable with no value - keeps its position and is rendered with
 * an actionable reason (see `blockedReason`) instead of being hidden or
 * silently dropped: the operator authored that order and only they should
 * change it.
 *
 * Mirrors `timeline-items.tsx`'s `@dnd-kit` setup (the reference
 * implementation for drag-and-drop in this repo) for the REMAINING entries:
 * a `PointerSensor` plus a `KeyboardSensor` so the queue is fully operable
 * without a mouse (focus the drag handle, Space to lift, arrow keys to
 * move, Space to drop, Escape to cancel), `closestCenter` collision
 * detection, `verticalListSortingStrategy`, handle-only drag listeners so
 * the row's Take/remove actions keep working with a mouse, and an
 * immutable `arrayMove` reorder over the FULL `entries` array (On Deck's
 * entry never appears in the sortable context, but `handleDragEnd` still
 * looks its dragged siblings up by id in the full array, so the reordered
 * result it emits keeps On Deck exactly where it was).
 *
 * `onReorder` emits the new order as entry IDS rather than entry objects, so
 * a reorder can never carry this render's copy of another entry's values back
 * to the server over a concurrent edit (see `use-show-rundown.ts`).
 *
 * Renders as "Show Rundown" in the Live tab, to the left of the live
 * item/inspector panel. Not a picker: a row has no click-to-load - the only
 * per-row actions are the explicit Take (load + take, right now), Refresh
 * (warm stat data), and Delete buttons.
 */
export const RundownList: FC<RundownListProps> = ({
  entries,
  rowInfo,
  refreshInfo,
  loadedEntryId,
  onReorder,
  onRemove,
  onQuickPlay,
  onRefresh,
  pendingEntryIds
}) => {
  const pending = new Set(pendingEntryIds);
  // An advance in flight is consuming an entry whose position the server has
  // not told us about yet, so dragging right now would compute a new order
  // from a list that is about to change under it. The reorder is expressed as
  // ids against the server's own entries (see `use-show-rundown.ts`), so it
  // could not corrupt anything - but it WOULD be applied to a different list
  // than the operator was looking at, which is its own kind of wrong.
  const reordering = pending.size > 0;
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 4 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (reordering) return;
    if (!over || active.id === over.id) return;
    const oldIndex = entries.findIndex((e) => e.entryId === active.id);
    const newIndex = entries.findIndex((e) => e.entryId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    // Immutable: `arrayMove` returns a new array, the source `entries` is
    // never spliced/mutated in place.
    onReorder(arrayMove(entries, oldIndex, newIndex).map((e) => e.entryId));
  };

  if (entries.length === 0) {
    return (
      <Typography.Text type='secondary' style={{ padding: 12 }}>
        The show rundown is empty.
      </Typography.Text>
    );
  }

  const [onDeckEntry, ...restEntries] = entries;
  const onDeckInfo: RundownRowInfo =
    rowInfo[onDeckEntry.entryId] ?? fallbackRowInfo(onDeckEntry);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          On Deck
        </Typography.Text>
        <OnDeckRow
          info={onDeckInfo}
          refresh={refreshInfo[onDeckEntry.entryId]}
          // The on-deck row is also what an advance that named NO entry
          // consumes, so it is pending for that too (`ON_DECK`).
          pending={pending.has(onDeckEntry.entryId) || pending.has(ON_DECK)}
          isLoaded={loadedEntryId === onDeckEntry.entryId}
          onQuickPlay={() => onQuickPlay(onDeckEntry.entryId)}
          onRefresh={() => onRefresh(onDeckEntry.entryId)}
          onRemove={() => onRemove(onDeckEntry.entryId)}
        />
      </div>

      {restEntries.length > 0 && (
        <div style={{ maxHeight: '100%', overflowY: 'auto' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={restEntries.map((e) => e.entryId)}
              strategy={verticalListSortingStrategy}
            >
              <div
                role='listbox'
                aria-label='Show rundown'
                style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
              >
                {restEntries.map((entry, index) => {
                  const info: RundownRowInfo =
                    rowInfo[entry.entryId] ?? fallbackRowInfo(entry);
                  return (
                    <SortableRow
                      key={entry.entryId}
                      entry={entry}
                      position={index + 2}
                      info={info}
                      refresh={refreshInfo[entry.entryId]}
                      pending={pending.has(entry.entryId)}
                      isLoaded={loadedEntryId === entry.entryId}
                      onQuickPlay={() => onQuickPlay(entry.entryId)}
                      onRefresh={() => onRefresh(entry.entryId)}
                      onRemove={() => onRemove(entry.entryId)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
};
