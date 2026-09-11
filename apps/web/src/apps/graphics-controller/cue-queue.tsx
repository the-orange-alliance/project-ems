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
import { QueueEntry } from '@toa-lib/models';
import { Button, Popconfirm, Space, Tag, Tooltip, Typography } from 'antd';
import dayjs from 'dayjs';
import { CSSProperties, FC } from 'react';
import type { QueueRowRefreshInfo } from './use-queue-row-refresh.js';

/** "Refresh (last refresh at 14:32)" / "Refresh (never refreshed)" / "Refreshing…" - shared by the On Deck row and every sortable row's refresh icon tooltip. */
function refreshTooltip(info: QueueRowRefreshInfo | undefined): string {
  if (info?.fetching) return 'Refreshing…';
  if (!info?.lastRefreshedAtUtc) return 'Refresh (never refreshed)';
  return `Refresh (last refresh at ${dayjs(info.lastRefreshedAtUtc).format('HH:mm')})`;
}

/**
 * Per-entry display info the parent resolves (it knows the timeline
 * catalog; this component only renders what it's given).
 */
export interface CueQueueRowInfo {
  /** Display name of the referenced timeline. */
  timelineName: string;
  /** Human-readable resolved variable values, e.g. "featured: 1234". */
  valueSummary: string;
  /** True when the timeline this entry points at no longer exists. */
  missing: boolean;
}

export interface CueQueueProps {
  entries: QueueEntry[];
  /** Per-entry display info, keyed by entryId — the parent resolves timeline names. */
  rowInfo: Record<string, CueQueueRowInfo>;
  /** Per-entry refresh state (fetching / last-refreshed), keyed by entryId — absent means never refreshed this session. Auto-fires when a row is promoted to On Deck (see `graphics-controller.tsx`); the icon here also lets the producer trigger one manually. */
  refreshInfo: Record<string, QueueRowRefreshInfo>;
  /** entryId currently loaded on the transport, or null. */
  loadedEntryId: string | null;
  onReorder: (entries: QueueEntry[]) => void;
  onRemove: (entryId: string) => void;
  /** Takes this entry to air immediately (load + take in one press). */
  onQuickPlay: (entryId: string) => void;
  /** Manually warms this row's stat data ahead of time - the same thing that fires automatically on promotion to On Deck. */
  onRefresh: (entryId: string) => void;
}

/** Name + resolved-values text, shared by the On Deck row and every
 * sortable row below it. */
const RowLabel: FC<{ info: CueQueueRowInfo }> = ({ info }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <Typography.Text
      strong
      ellipsis
      type={info.missing ? 'danger' : undefined}
      style={{ display: 'block' }}
    >
      {info.missing && <WarningOutlined style={{ marginRight: 4 }} />}
      {info.missing ? 'Missing timeline' : info.timelineName}
    </Typography.Text>
    <Typography.Text
      type='secondary'
      ellipsis
      style={{ display: 'block', fontSize: 12 }}
    >
      {info.valueSummary}
    </Typography.Text>
  </div>
);

/** Take (quick play) + Refresh + Delete, shared by the On Deck row and every
 * sortable row below it. Take is styled green/play rather than red/
 * thunderbolt - it is the everyday "run the next thing" action here, not an
 * alarming one. Refresh (`SyncOutlined`, spinning while `refresh.fetching`)
 * warms this row's stat data on demand - the same thing On Deck promotion
 * already triggers automatically (see `graphics-controller.tsx`). */
const RowActions: FC<{
  info: CueQueueRowInfo;
  refresh: QueueRowRefreshInfo | undefined;
  onQuickPlay: () => void;
  onRefresh: () => void;
  onRemove: () => void;
}> = ({ info, refresh, onQuickPlay, onRefresh, onRemove }) => (
  <Space size={4} onClick={(e) => e.stopPropagation()}>
    <Tooltip title={info.missing ? 'Missing timeline' : 'Take'}>
      <span>
        <Button
          type='text'
          size='small'
          icon={<PlayCircleOutlined />}
          style={
            info.missing ? undefined : { color: 'var(--ant-color-success)' }
          }
          aria-label={`Take ${info.timelineName} to air now`}
          disabled={info.missing}
          onClick={onQuickPlay}
        />
      </span>
    </Tooltip>
    <Tooltip title={refreshTooltip(refresh)}>
      <span>
        <Button
          type='text'
          size='small'
          icon={<SyncOutlined spin={refresh?.fetching} />}
          aria-label={`Refresh ${info.timelineName}'s stat data`}
          disabled={info.missing || refresh?.fetching}
          onClick={onRefresh}
        />
      </span>
    </Tooltip>
    <Popconfirm
      title='Remove this cue?'
      description='This cannot be undone.'
      okText='Remove'
      okType='danger'
      onConfirm={onRemove}
    >
      <Button
        type='text'
        size='small'
        danger
        icon={<DeleteOutlined />}
        aria-label={`Remove ${info.timelineName}`}
      />
    </Popconfirm>
  </Space>
);

interface OnDeckRowProps {
  info: CueQueueRowInfo;
  refresh: QueueRowRefreshInfo | undefined;
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
        : info.missing
          ? 'var(--ant-color-error-bg)'
          : undefined
    }}
  >
    <RowLabel info={info} />
    {isLoaded && <Tag color='success'>LOADED</Tag>}
    <RowActions
      info={info}
      refresh={refresh}
      onQuickPlay={onQuickPlay}
      onRefresh={onRefresh}
      onRemove={onRemove}
    />
  </div>
);

interface SortableRowProps {
  entry: QueueEntry;
  position: number;
  info: CueQueueRowInfo;
  refresh: QueueRowRefreshInfo | undefined;
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
      : info.missing
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
        onQuickPlay={onQuickPlay}
        onRefresh={onRefresh}
        onRemove={onRemove}
      />
    </div>
  );
};

/**
 * Drag-to-reorder cue queue — the ordered list of timelines a broadcast
 * producer runs in order during a show. Fully controlled: the parent owns
 * `entries`/`rowInfo`/`loadedEntryId` and this component only emits intent
 * callbacks.
 *
 * The first entry is pulled out into a fixed "On Deck" row above the rest
 * (see `OnDeckRow`) - it is always queue position 1, marked with a yellow
 * border rather than being just another row in the sortable list.
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
 * Named `CueQueue*` deliberately avoids colliding with `@toa-lib/models`'s
 * `CueQueue` document type (`{ eventKey, entries, updatedAtUtc }`) — this
 * export is `CueQueueList`, not `CueQueue`.
 *
 * Renders as "Timeline Queue" in the Live tab, to the left of the live
 * item/inspector panel. Not a picker: a row has no click-to-load - the only
 * per-row actions are the explicit Take (load + take, right now), Refresh
 * (warm stat data), and Delete buttons.
 */
export const CueQueueList: FC<CueQueueProps> = ({
  entries,
  rowInfo,
  refreshInfo,
  loadedEntryId,
  onReorder,
  onRemove,
  onQuickPlay,
  onRefresh
}) => {
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
    if (!over || active.id === over.id) return;
    const oldIndex = entries.findIndex((e) => e.entryId === active.id);
    const newIndex = entries.findIndex((e) => e.entryId === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    // Immutable: `arrayMove` returns a new array, the source `entries` is
    // never spliced/mutated in place.
    onReorder(arrayMove(entries, oldIndex, newIndex));
  };

  if (entries.length === 0) {
    return (
      <Typography.Text type='secondary' style={{ padding: 12 }}>
        The timeline queue is empty.
      </Typography.Text>
    );
  }

  const [onDeckEntry, ...restEntries] = entries;
  const onDeckInfo: CueQueueRowInfo = rowInfo[onDeckEntry.entryId] ?? {
    timelineName: onDeckEntry.timelineId,
    valueSummary: '',
    missing: true
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Typography.Text type='secondary' style={{ fontSize: 12 }}>
          On Deck
        </Typography.Text>
        <OnDeckRow
          info={onDeckInfo}
          refresh={refreshInfo[onDeckEntry.entryId]}
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
                aria-label='Timeline queue'
                style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
              >
                {restEntries.map((entry, index) => {
                  const info: CueQueueRowInfo = rowInfo[entry.entryId] ?? {
                    timelineName: entry.timelineId,
                    valueSummary: '',
                    missing: true
                  };
                  return (
                    <SortableRow
                      key={entry.entryId}
                      entry={entry}
                      position={index + 2}
                      info={info}
                      refresh={refreshInfo[entry.entryId]}
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
