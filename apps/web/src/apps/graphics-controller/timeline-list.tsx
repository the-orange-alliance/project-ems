import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { VersionedTimeline } from '@toa-lib/models';
import {
  Button,
  Input,
  List,
  Popconfirm,
  Space,
  Spin,
  Switch,
  Tooltip,
  Typography
} from 'antd';
import { FC, useState } from 'react';
import { graphicsApi, useTimelines } from 'src/api/use-graphics-data.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { requestLoadState } from 'src/api/load-state.js';
import { LoadStateNotice } from 'src/components/util/load-state-notice.js';

export interface TimelineListProps {
  eventKey: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * Compact left-rail list of an event's saved timelines. Supports selecting,
 * creating (inline name entry), renaming, duplicating, and deleting (behind
 * a confirmation) a timeline.
 *
 * This component only ever touches the timeline "shell" (id/name/
 * description) via `graphicsApi.create`/`update`/`delete` - each of those
 * calls already triggers SWR's `mutate()` on the timelines key internally
 * (see `use-graphics-data.ts`), so there is no separate dirty-buffer here.
 * Editing the ITEMS inside the selected timeline is a different, staged-
 * edit concern owned by `use-timeline-editor.ts` + `timeline-items.tsx`.
 */
export const TimelineList: FC<TimelineListProps> = ({
  eventKey,
  selectedId,
  onSelect
}) => {
  const request = useTimelines(eventKey);
  const { data: timelines } = request;
  const loadState = requestLoadState('timelines', request);
  const isLoading = loadState.status === 'loading';
  const { showErrorSnackbar } = useSnackbar();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [creatingBusy, setCreatingBusy] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [busyId, setBusyId] = useState<string | null>(null);

  const startCreate = () => {
    setNewName('');
    setCreating(true);
  };

  const cancelCreate = () => {
    setCreating(false);
    setNewName('');
  };

  const commitCreate = async () => {
    if (creatingBusy) return;
    const name = newName.trim();
    if (!name) {
      cancelCreate();
      return;
    }
    setCreatingBusy(true);
    try {
      const created = await graphicsApi.create.timeline(eventKey, {
        timelineId: crypto.randomUUID(),
        eventKey,
        name,
        items: []
      });
      cancelCreate();
      if (created) onSelect(created.timelineId);
    } catch (e) {
      showErrorSnackbar('Error while creating timeline.', e);
    } finally {
      setCreatingBusy(false);
    }
  };

  const startRename = (t: VersionedTimeline) => {
    setEditingId(t.timelineId);
    setEditingName(t.name);
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  const commitRename = async (t: VersionedTimeline) => {
    const name = editingName.trim();
    cancelRename();
    if (!name || name === t.name) return;
    setBusyId(t.timelineId);
    try {
      await graphicsApi.update.timeline(
        eventKey,
        t.timelineId,
        { name },
        t.revision
      );
    } catch (e) {
      showErrorSnackbar('Error while renaming timeline.', e);
    } finally {
      setBusyId(null);
    }
  };

  const duplicate = async (t: VersionedTimeline) => {
    setBusyId(t.timelineId);
    try {
      const created = await graphicsApi.create.timeline(eventKey, {
        timelineId: crypto.randomUUID(),
        eventKey,
        name: `${t.name} (copy)`,
        description: t.description,
        variables: t.variables,
        items: t.items
      });
      if (created) onSelect(created.timelineId);
    } catch (e) {
      showErrorSnackbar('Error while duplicating timeline.', e);
    } finally {
      setBusyId(null);
    }
  };

  /**
   * Published is a plain on/off switch, persisted immediately (no staged
   * buffer, same as rename) - it only gates whether the timeline shows up
   * in the Timeline Queue's "Search timelines to add…" picker
   * (`GET /timelines?published=true`, see `use-graphics-data.ts`), so
   * there's no live-show risk in flipping it right away.
   */
  const togglePublished = async (t: VersionedTimeline, published: boolean) => {
    setBusyId(t.timelineId);
    try {
      await graphicsApi.update.timeline(
        eventKey,
        t.timelineId,
        { published },
        t.revision
      );
    } catch (e) {
      showErrorSnackbar('Error while updating timeline.', e);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (t: VersionedTimeline) => {
    setBusyId(t.timelineId);
    try {
      await graphicsApi.delete.timeline(eventKey, t.timelineId, t.revision);
      if (selectedId === t.timelineId) {
        const remaining = (timelines ?? []).filter(
          (x) => x.timelineId !== t.timelineId
        );
        if (remaining[0]) onSelect(remaining[0].timelineId);
      }
    } catch (e) {
      showErrorSnackbar('Error while deleting timeline.', e);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px'
        }}
      >
        <Typography.Text strong>Timelines</Typography.Text>
        <Button
          size='small'
          type='text'
          icon={<PlusOutlined />}
          onClick={startCreate}
          aria-label='New timeline'
        />
      </div>

      {creating && (
        <div style={{ padding: '0 12px 8px' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              autoFocus
              size='small'
              placeholder='Timeline name'
              value={newName}
              disabled={creatingBusy}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCreate();
                if (e.key === 'Escape') cancelCreate();
              }}
              onBlur={() => (newName.trim() ? commitCreate() : cancelCreate())}
            />
          </Space.Compact>
        </div>
      )}

      <LoadStateNotice state={loadState} retry={() => request.mutate()} />
      {loadState.status === 'ready' && (
        <Spin spinning={isLoading}>
          <List
            size='small'
            dataSource={timelines ?? []}
            locale={{ emptyText: 'No timelines yet' }}
            rowKey='timelineId'
            renderItem={(t) => {
              const isSelected = t.timelineId === selectedId;
              const isEditing = editingId === t.timelineId;
              const isBusy = busyId === t.timelineId;
              return (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    padding: '6px 12px',
                    background: isSelected
                      ? 'var(--ant-color-primary-bg)'
                      : undefined
                  }}
                  onClick={() => !isEditing && onSelect(t.timelineId)}
                >
                  {isEditing ? (
                    <Input
                      autoFocus
                      size='small'
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(t);
                        if (e.key === 'Escape') cancelRename();
                      }}
                      onBlur={() => commitRename(t)}
                    />
                  ) : (
                    // Title on its own row, actions on the row below it -
                    // rather than antd's default `actions` placement (a fixed
                    // column to the right of the title), which squeezed long
                    // names like "Demo Match Start 1" down into a sliver and
                    // wrapped them one word per line.
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        width: '100%'
                      }}
                    >
                      <Typography.Text
                        strong={isSelected}
                        style={{ display: 'block' }}
                      >
                        {t.name}
                      </Typography.Text>
                      <Space size={4} onClick={(e) => e.stopPropagation()}>
                        <Tooltip
                          title={
                            t.published
                              ? 'Published - shown in the Timeline Queue search'
                              : 'Unpublished - hidden from the Timeline Queue search'
                          }
                        >
                          <Switch
                            size='small'
                            checked={!!t.published}
                            disabled={isBusy}
                            aria-label={`${t.name} published`}
                            onChange={(checked) => togglePublished(t, checked)}
                          />
                        </Tooltip>
                        <Button
                          size='small'
                          type='text'
                          icon={<EditOutlined />}
                          aria-label={`Rename ${t.name}`}
                          disabled={isBusy}
                          onClick={() => startRename(t)}
                        />
                        <Button
                          size='small'
                          type='text'
                          icon={<CopyOutlined />}
                          aria-label={`Duplicate ${t.name}`}
                          disabled={isBusy}
                          onClick={() => duplicate(t)}
                        />
                        <Popconfirm
                          title='Delete this timeline?'
                          description='This cannot be undone.'
                          okText='Delete'
                          okType='danger'
                          onConfirm={() => remove(t)}
                        >
                          <Button
                            size='small'
                            type='text'
                            danger
                            icon={<DeleteOutlined />}
                            aria-label={`Delete ${t.name}`}
                            disabled={isBusy}
                          />
                        </Popconfirm>
                      </Space>
                      <Typography.Text
                        type='secondary'
                        style={{ fontSize: 12 }}
                      >
                        {t.items.length} item{t.items.length === 1 ? '' : 's'}
                      </Typography.Text>
                    </div>
                  )}
                </List.Item>
              );
            }}
          />
        </Spin>
      )}
    </div>
  );
};
