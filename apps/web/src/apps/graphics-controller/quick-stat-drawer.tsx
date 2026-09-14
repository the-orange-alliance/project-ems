import {
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import type { GraphicSpec } from '@toa-lib/models';
import { presentationFor } from '@toa-lib/models/seasons/stats/presentation';
import {
  Button,
  Empty,
  Input,
  List,
  Space,
  Tag,
  Tooltip,
  Typography,
  type InputRef
} from 'antd';
import { FC, useEffect, useMemo, useRef, useState } from 'react';
import {
  useStatsCatalogue,
  type StatCatalogueEntry
} from '../../api/use-stats-data.js';
import { buildDefaultSpec } from './build-default-spec.js';

export interface QuickStatDrawerProps {
  eventKey: string;
  onPreview: (spec: GraphicSpec) => void;
  onCue: (spec: GraphicSpec) => void;
  onAppendToTimeline: (spec: GraphicSpec) => void;
  onTakeNow: (spec: GraphicSpec) => void;
}

const SCOPES: StatCatalogueEntry['scope'][] = [
  'event',
  'team',
  'match',
  'alliance'
];

const SECTION_LETTERS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M'
];

// Rendering all 232 rows at once is still fine perf-wise, but there is no
// reason for a producer to ever need to scroll through more than this many
// - by the time a filter is this loose the search box has already narrowed
// things enough, or the producer should narrow it further. Capping (rather
// than virtualizing) keeps this component free of a virtualization
// dependency for a list that is never actually large once filtered.
const MAX_RESULTS = 50;

const letterOf = (catalogueId: string): string => {
  const match = /^[A-Za-z]+/.exec(catalogueId);
  return match ? match[0].toUpperCase() : '';
};

const toggle = (set: ReadonlySet<string>, value: string): Set<string> => {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
};

/**
 * Right-hand "Quick Stat" panel: search/filter across the full 232-entry
 * stats catalogue, then one click on a result either sends a fully-formed
 * `GraphicSpec` to air or appends it to the working timeline - no
 * intermediate configuration step. `buildDefaultSpec` (together with
 * `presentationFor`) is what makes the draft complete without any user
 * input; this component's only job is getting the producer to the right
 * catalogue entry as fast as possible.
 */
export const QuickStatDrawer: FC<QuickStatDrawerProps> = ({
  eventKey,
  onPreview,
  onCue,
  onAppendToTimeline,
  onTakeNow
}) => {
  const { data: catalogue = [], isLoading } = useStatsCatalogue(eventKey);
  const [search, setSearch] = useState('');
  const [scopes, setScopes] = useState<Set<string>>(new Set());
  const [letters, setLetters] = useState<Set<string>>(new Set());
  const searchRef = useRef<InputRef>(null);

  // The search box takes keyboard focus as soon as this panel is on
  // screen - a producer under time pressure should be able to start typing
  // the instant the drawer opens, with no intermediate click.
  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return catalogue.filter((entry) => {
      if (scopes.size > 0 && !scopes.has(entry.scope)) return false;
      if (letters.size > 0 && !letters.has(letterOf(entry.catalogueId)))
        return false;
      if (!term) return true;
      return (
        entry.name.toLowerCase().includes(term) ||
        entry.description.toLowerCase().includes(term) ||
        entry.slug.toLowerCase().includes(term) ||
        entry.catalogueId.toLowerCase().includes(term)
      );
    });
  }, [catalogue, search, scopes, letters]);

  const visible = filtered.slice(0, MAX_RESULTS);

  // Builds the complete draft `GraphicSpec` for one catalogue entry. This is
  // the entire "one click" step: `presentationFor` supplies the
  // visualization metadata (default kind/precision/etc - unrelated to the
  // catalogue entry's own `family`, which is data provenance), and
  // `buildDefaultSpec` turns that + the catalogue entry into a spec with
  // every required field populated.
  const draftFor = (entry: StatCatalogueEntry): GraphicSpec =>
    buildDefaultSpec(entry, presentationFor(entry.catalogueId));

  const handlePreview = (entry: StatCatalogueEntry) =>
    onPreview(draftFor(entry));

  const handleCue = (entry: StatCatalogueEntry) => onCue(draftFor(entry));

  const handleAppend = (entry: StatCatalogueEntry) =>
    onAppendToTimeline(draftFor(entry));

  const handleTakeNow = (entry: StatCatalogueEntry) =>
    onTakeNow(draftFor(entry));

  // Enter, without ever leaving the keyboard, previews the top result -
  // the fastest possible path to a ready preview before a deliberate cue or take.
  const handleSearchPressEnter = () => {
    const [top] = visible;
    if (top) handlePreview(top);
  };

  return (
    <div
      aria-label='Quick Stat search panel'
      style={{
        width: 320,
        maxWidth: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 0
      }}
    >
      <Typography.Title level={5} style={{ margin: 0 }}>
        Quick Stat
      </Typography.Title>
      <Input
        ref={searchRef}
        aria-label='Search stats'
        placeholder='Search stats... (Enter previews the top result)'
        prefix={<SearchOutlined />}
        allowClear
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onPressEnter={handleSearchPressEnter}
      />
      <Space size={[4, 4]} wrap>
        {SCOPES.map((scope) => (
          <Tag.CheckableTag
            key={scope}
            checked={scopes.has(scope)}
            onChange={() => setScopes((prev) => toggle(prev, scope))}
          >
            {scope}
          </Tag.CheckableTag>
        ))}
      </Space>
      <Space size={[4, 4]} wrap>
        {SECTION_LETTERS.map((letter) => (
          <Tag.CheckableTag
            key={letter}
            checked={letters.has(letter)}
            onChange={() => setLetters((prev) => toggle(prev, letter))}
          >
            {letter}
          </Tag.CheckableTag>
        ))}
      </Space>
      <Typography.Text type='secondary' style={{ fontSize: 12 }}>
        {isLoading
          ? 'Loading catalogue...'
          : `${filtered.length} match${filtered.length === 1 ? '' : 'es'}${
              filtered.length > MAX_RESULTS
                ? ` - showing first ${MAX_RESULTS}, refine your search`
                : ''
            }`}
      </Typography.Text>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {!isLoading && visible.length === 0 ? (
          <Empty description='No stats match' style={{ marginTop: 24 }} />
        ) : (
          <List
            size='small'
            dataSource={visible}
            loading={isLoading}
            renderItem={(entry) => (
              <List.Item
                key={entry.catalogueId}
                style={{ cursor: 'pointer', paddingInline: 4 }}
                onClick={() => handlePreview(entry)}
                actions={[
                  <Tooltip title='Preview' key='preview'>
                    <Button
                      type='text'
                      size='small'
                      icon={<EyeOutlined />}
                      aria-label={`Preview ${entry.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreview(entry);
                      }}
                    />
                  </Tooltip>,
                  <Tooltip title='Cue' key='cue'>
                    <Button
                      type='text'
                      size='small'
                      icon={<SendOutlined />}
                      aria-label={`Cue ${entry.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCue(entry);
                      }}
                    />
                  </Tooltip>,
                  <Tooltip title='Add to timeline' key='timeline'>
                    <Button
                      type='text'
                      size='small'
                      icon={<PlusOutlined />}
                      aria-label={`Add ${entry.name} to timeline`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAppend(entry);
                      }}
                    />
                  </Tooltip>,
                  <Tooltip title='Take now' key='take-now'>
                    <Button
                      type='text'
                      size='small'
                      icon={<ThunderboltOutlined />}
                      aria-label={`Take ${entry.name} now`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTakeNow(entry);
                      }}
                    />
                  </Tooltip>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space size={4}>
                      <Tag>{entry.catalogueId}</Tag>
                      <Typography.Text strong ellipsis>
                        {entry.name}
                      </Typography.Text>
                    </Space>
                  }
                  description={
                    <Typography.Text
                      type='secondary'
                      ellipsis={{ tooltip: entry.description }}
                      style={{ fontSize: 12, display: 'block' }}
                    >
                      {entry.description}
                    </Typography.Text>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  );
};
