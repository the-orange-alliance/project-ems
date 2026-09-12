import {
  CopyOutlined,
  DeleteOutlined,
  HolderOutlined
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
import { GraphicSpec } from '@toa-lib/models';
import { Button, Popconfirm, Space, Tag, Typography } from 'antd';
import { CSSProperties, FC } from 'react';

export interface TimelineItemsProps {
  items: GraphicSpec[];
  liveIndex: number | null;
  /** Whether the item at `liveIndex` is actually on air (animated in), as
   * opposed to merely loaded/cued there but not yet taken. Ignored when
   * `liveIndex` is `null`. Drives the row's color: red once it's really on
   * air, green while it's only cued/on-deck - see `SortableRow`. */
  liveOnAir: boolean;
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  onReorder: (items: GraphicSpec[]) => void;
  onDeleteItem: (id: string) => void;
  onDuplicateItem: (id: string) => void;
}

const KIND_LABEL: Record<GraphicSpec['kind'], string> = {
  'stat-tile': 'Stat Tile',
  bar: 'Bar',
  'grouped-bar': 'Grouped Bar',
  line: 'Line',
  histogram: 'Histogram',
  'ranking-table': 'Ranking',
  heatmap: 'Heatmap',
  'geo-map': 'Geo Map',
  table: 'Table'
};

const MODE_LABEL: Record<GraphicSpec['mode'], string> = {
  fullscreen: 'Fullscreen',
  'drawer-left': 'Drawer L',
  'drawer-right': 'Drawer R',
  'lower-third': 'Lower 3rd'
};

interface SortableRowProps {
  item: GraphicSpec;
  position: number;
  isLive: boolean;
  /** Only meaningful when `isLive` - true once this item is actually on air. */
  isOnAir: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

/**
 * One draggable row. Drag affordance/keyboard focus lives on the handle
 * button alone (`{...attributes} {...listeners}`) rather than the whole
 * row, so the row itself stays a plain click target for "select this item
 * for editing" and the action buttons keep working with a mouse.
 *
 * ATEM-style color for the live row: red once it's genuinely on air,
 * green while it's cued/loaded here but not yet taken - mirroring the
 * Timeline Queue's green "On Deck" row and the transport box's red
 * Program border (see `cue-queue.tsx` / `graphics-controller.tsx`). A row
 * that is merely `isLive` (loaded) but not `isOnAir` must never look the
 * same as one actually broadcasting.
 */
const SortableRow: FC<SortableRowProps> = ({
  item,
  position,
  isLive,
  isOnAir,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

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
    border: isSelected
      ? '1px solid var(--ant-color-primary)'
      : '1px solid transparent',
    background: isLive
      ? isOnAir
        ? 'var(--ant-color-error-bg)'
        : 'var(--ant-color-success-bg)'
      : isSelected
        ? 'var(--ant-color-primary-bg)'
        : undefined,
    cursor: 'pointer'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role='option'
      aria-selected={isSelected}
      onClick={onSelect}
    >
      <Button
        type='text'
        size='small'
        icon={<HolderOutlined />}
        aria-label={`Reorder ${item.title}`}
        style={{ cursor: 'grab', touchAction: 'none' }}
        onClick={(e) => e.stopPropagation()}
        {...attributes}
        {...listeners}
      />
      <Typography.Text
        type='secondary'
        style={{ width: 22, textAlign: 'right', flexShrink: 0 }}
      >
        {position}
      </Typography.Text>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Typography.Text strong ellipsis style={{ display: 'block' }}>
          {item.title}
        </Typography.Text>
        {item.subtitle && (
          <Typography.Text
            type='secondary'
            ellipsis
            style={{ display: 'block', fontSize: 12 }}
          >
            {item.subtitle}
          </Typography.Text>
        )}
      </div>
      <Tag>{KIND_LABEL[item.kind]}</Tag>
      <Tag color='blue'>{MODE_LABEL[item.mode]}</Tag>
      {isLive && (
        <Tag color={isOnAir ? 'red' : 'success'}>
          {isOnAir ? 'LIVE' : 'ON DECK'}
        </Tag>
      )}
      <Space size={4} onClick={(e) => e.stopPropagation()}>
        <Button
          type='text'
          size='small'
          icon={<CopyOutlined />}
          aria-label={`Duplicate ${item.title}`}
          onClick={onDuplicate}
        />
        <Popconfirm
          title='Delete this graphic?'
          description={
            isOnAir
              ? 'This item is currently live on air. Deleting it will not remove it from the broadcast automatically.'
              : 'This cannot be undone.'
          }
          okText='Delete'
          okType='danger'
          onConfirm={onDelete}
        >
          <Button
            type='text'
            size='small'
            danger
            icon={<DeleteOutlined />}
            aria-label={`Delete ${item.title}`}
          />
        </Popconfirm>
      </Space>
    </div>
  );
};

/**
 * Ordered, drag-to-reorder list of the `GraphicSpec` items in the selected
 * timeline. Reordering uses `@dnd-kit/sortable` with both a `PointerSensor`
 * and a `KeyboardSensor` registered, so the list is fully operable without
 * a mouse (focus the drag handle, then Space to lift, arrow keys to move,
 * Space to drop, Escape to cancel - `@dnd-kit`'s standard keyboard sorting
 * interaction). This is the first drag-and-drop UI in the repo, so the
 * pattern here (handle-only listeners, `arrayMove` for an immutable
 * reorder, `closestCenter` collision detection) is the one to copy.
 */
export const TimelineItems: FC<TimelineItemsProps> = ({
  items,
  liveIndex,
  liveOnAir,
  selectedItemId,
  onSelectItem,
  onReorder,
  onDeleteItem,
  onDuplicateItem
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
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    // Immutable: `arrayMove` returns a new array, the source `items` is
    // never spliced/mutated in place.
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  if (items.length === 0) {
    return (
      <Typography.Text type='secondary' style={{ padding: 12 }}>
        This timeline has no graphics yet.
      </Typography.Text>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          role='listbox'
          aria-label='Timeline graphics'
          style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
        >
          {items.map((item, index) => (
            <SortableRow
              key={item.id}
              item={item}
              position={index + 1}
              isLive={liveIndex === index}
              isOnAir={liveIndex === index && liveOnAir}
              isSelected={selectedItemId === item.id}
              onSelect={() => onSelectItem(item.id)}
              onDelete={() => onDeleteItem(item.id)}
              onDuplicate={() => onDuplicateItem(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};
