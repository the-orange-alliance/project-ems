import { timelineBoundVariables } from '@toa-lib/models';
import { Divider, Empty, Typography } from 'antd';
import { FC, ReactNode } from 'react';
import type { StatCatalogueEntry } from '../../api/use-stats-data.js';
import { GraphicInspector } from './graphic-inspector.js';
import { TimelineItems } from './timeline-items.js';
import type { UseTimelineEditorResult } from './use-timeline-editor.js';
import { VariableEditor } from './variable-editor.js';

export interface TimelineItemsPanelProps {
  /**
   * The dirty-buffer editor whose timeline this panel edits. The caller owns
   * the hook (so its staged edits survive tab switches) - this component is
   * purely a view over it.
   */
  editor: UseTimelineEditorResult;
  /** Stat catalogue, used to resolve the selected item's params schema. */
  catalogue: StatCatalogueEntry[];
  /** Index of the item under the transport playhead, or `null` if the
   * transport is not sitting on this panel's timeline. */
  liveIndex: number | null;
  /** Whether the item at `liveIndex` is actually on air. Ignored when
   * `liveIndex` is `null`. Defaults to `false` - callers that never pass a
   * live index (the Editor tab) don't need to think about it. */
  liveOnAir?: boolean;
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  /** Optional banner rendered above the variable editor (e.g. the Live tab's
   * "you are editing the cued timeline" warning). */
  header?: ReactNode;
  /** Message shown in place of the editor when `editor.timeline` is `null`. */
  emptyText?: string;
}

/**
 * The variable editor + item list + graphic inspector for a single timeline.
 *
 * Extracted verbatim from the old middle column of `GraphicsController` so the
 * exact same editing surface can be pointed at either the producer's
 * hand-selected timeline (the "Editor" tab) or the timeline currently cued to
 * the transport (the "Live" tab). All persistence still flows through the
 * `editor` prop's staged buffer - this component never touches the network.
 */
export const TimelineItemsPanel: FC<TimelineItemsPanelProps> = ({
  editor,
  catalogue,
  liveIndex,
  liveOnAir = false,
  selectedItemId,
  onSelectItem,
  header,
  emptyText = 'Select a timeline to edit its items.'
}) => {
  const selectedItem =
    editor.items.find((item) => item.id === selectedItemId) ?? null;
  const selectedCatalogueEntry = selectedItem
    ? (catalogue.find((entry) => entry.slug === selectedItem.stat) ?? null)
    : null;

  if (!editor.timeline) {
    return (
      <>
        {header}
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={emptyText}
          style={{ marginTop: 48 }}
        />
      </>
    );
  }

  return (
    <>
      {header}

      <div style={{ marginBottom: 12 }}>
        <VariableEditor
          variables={editor.timeline.variables ?? []}
          boundNames={timelineBoundVariables(editor.timeline)}
          onChange={editor.setVariables}
        />
      </div>

      <Typography.Text strong>Items</Typography.Text>
      <div style={{ marginTop: 8 }}>
        <TimelineItems
          items={editor.items}
          liveIndex={liveIndex}
          liveOnAir={liveOnAir}
          selectedItemId={selectedItemId}
          onSelectItem={onSelectItem}
          onReorder={editor.reorder}
          onDeleteItem={editor.removeItem}
          onDuplicateItem={editor.duplicateItem}
        />
      </div>

      {selectedItem && selectedCatalogueEntry && (
        <>
          <Divider />
          <Typography.Text strong>Inspector</Typography.Text>
          <div style={{ marginTop: 8 }}>
            <GraphicInspector
              spec={selectedItem}
              catalogueEntry={selectedCatalogueEntry}
              variables={editor.timeline.variables ?? []}
              onChange={(next) => editor.updateItem(selectedItem.id, next)}
            />
          </div>
        </>
      )}
    </>
  );
};
