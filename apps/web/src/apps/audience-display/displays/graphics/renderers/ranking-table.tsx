import type { CSSProperties } from 'react';
import type { GraphicSpec, VizFrame } from '@toa-lib/models';
import type { SemanticCell } from '@toa-lib/models/seasons/stats/presentation';
import {
  allianceColor,
  fontFamily,
  palette,
  rampColor,
  textStrokeStyle
} from '../theme.js';
import { vw } from '../composition.js';
import {
  formatLegacyNumber,
  formatLegacyCell,
  formatTypedCell,
  legacyRowAllianceGroup,
  paginate,
  resolveLegacyPrecision,
  resolveRowRank
} from './presentation-format.js';
import {
  BroadcastPageIndicator,
  TABLE_PADDING,
  RANKING_ROW_HEIGHT,
  RANKING_ROW_GAP,
  useBroadcastTablePage
} from './broadcast-table-layout.js';

/**
 * `ranking-table` renderer — an on-air leaderboard.
 *
 * Prefers the typed v2 payload (`frame.data.kind === 'ranking-table'`):
 * team identity comes from the row's own `label` (the designated identity
 * field — never "whichever numeric column happens to be first"), and rank
 * comes from the row's authoritative `rank` field, not from the row's
 * position in whatever (possibly filtered) array is being rendered. A
 * filtered result that starts at rank 7 renders "7" and "8", never
 * renumbered to "1"/"2" by array position — that was a real bug (L11).
 * Each stat column carries its own `MeasureFormat`, so mixed units (a
 * percentage next to a raw count) each render honoring their own
 * precision/unit/percent scale.
 *
 * Falls back to legacy `frame.columns`/`frame.rows` (first column treated
 * as the label column, rest as numeric stat columns) or `frame.series`
 * (first series supplies rank order + labels) when the frame has not been
 * migrated — the legacy path has no authoritative rank, so rank there is
 * still the row's on-screen position, exactly as before.
 *
 * An audience member cannot scroll a broadcast graphic: rows beyond one
 * page's capacity are paged through non-interactively, cycling on a timer
 * derived from `spec.holdMs` (the shared playback/composition contract's
 * own timing field — see `presentation-format.ts`) rather than an
 * independent random interval.
 *
 * `null` cells mean explicitly missing data and always render as an
 * em-dash in `palette.nullNeutral` — never coerced to zero.
 *
 * Title/subtitle are owned by the composition container — this renderer
 * never draws `frame.title`/`frame.subtitle` itself.
 *
 * ALLIANCE GROUPING (Phase 2 of `teamsInMatchId`, modular/opt-in — see
 * `bar-chart.tsx`'s fuller doc comment for the shared contract). ONLY
 * Option 1 (a colored accent) applies to a RANKING table specifically —
 * Option 2 (reordering into red/blue clusters) does not, and never will:
 * this renderer's entire purpose is a strict, authoritative rank order (see
 * the block comment above), and reordering by alliance would silently
 * break that guarantee. When a row carries a `group`, its rank-ramp accent
 * (border + rank number color) is replaced by the alliance color; rows stay
 * in rank order regardless.
 */

interface RendererProps {
  frame: VizFrame;
  spec: GraphicSpec;
}

interface DisplayColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
}

interface DisplayCell {
  key: string;
  label: string;
  text: string | null;
}

interface DisplayRow {
  id: string;
  rank: number;
  label: string;
  cells: DisplayCell[];
  /** `teamsInMatchId` alliance grouping (see the component doc comment above) - `undefined` unless the source stat used it. */
  group?: 'red' | 'blue';
}

function buildFromSemanticData(
  frame: VizFrame
): { columns: DisplayColumn[]; rows: DisplayRow[] } | undefined {
  const { data } = frame;
  if (!data || data.kind !== 'ranking-table') return undefined;

  const columns: DisplayColumn[] = data.columns.map((column) => ({
    key: column.id,
    label: column.label,
    align: column.align
  }));

  const rows: DisplayRow[] = data.rows.map((row, index) => ({
    id: row.id,
    // Authoritative — never derived from `index`. A filtered rank 7/8 stays
    // 7/8; `index` is only the defensive fallback inside resolveRowRank for
    // a malformed row that genuinely has no rank.
    rank: resolveRowRank(row, index),
    // Identity comes from the row's own `label` — the designated identity
    // field — never from `data.columns[0]` or any other numeric column.
    label: row.label,
    group: row.group,
    cells: data.columns.map((column) => {
      const cell = row.cells[column.id] ?? null;
      return {
        key: column.id,
        label: column.label,
        text:
          cell === null
            ? null
            : formatTypedCell(
                cell as Exclude<SemanticCell, null>,
                column.format
              )
      };
    })
  }));

  return { columns, rows };
}

function buildFromLegacyColumns(
  frame: VizFrame,
  precision: number
): { columns: DisplayColumn[]; rows: DisplayRow[] } {
  const [labelColumn, ...rest] = frame.columns ?? [];
  const columns: DisplayColumn[] = rest.map((c) => ({
    key: c.key,
    label: c.label
  }));
  const rows: DisplayRow[] = (frame.rows ?? []).map((row, index) => ({
    id: `row-${index}`,
    rank: resolveRowRank({}, index),
    label: labelColumn ? String(row[labelColumn.key] ?? '—') : '—',
    group: legacyRowAllianceGroup(row as Record<string, unknown>),
    cells: columns.map((c) => {
      const raw = row[c.key];
      const value = raw ?? null;
      return {
        key: c.key,
        label: c.label,
        text: value === null ? null : formatLegacyCell(value, precision)
      };
    })
  }));
  return { columns, rows };
}

function buildFromLegacySeries(
  frame: VizFrame,
  precision: number
): { columns: DisplayColumn[]; rows: DisplayRow[] } {
  const [primary, ...rest] = frame.series;
  if (!primary) return { columns: [], rows: [] };

  const columns: DisplayColumn[] = [
    { key: 'primary', label: primary.name ?? frame.axis?.yLabel ?? 'Value' },
    ...rest.map((s, i) => ({
      key: `extra-${i}`,
      label: s.name ?? `Series ${i + 2}`
    }))
  ];

  const rows: DisplayRow[] = primary.points.map((point, index) => {
    const values = [
      point.value,
      ...rest.map((s) => s.points[index]?.value ?? null)
    ];
    return {
      id: `row-${index}`,
      rank: resolveRowRank({}, index),
      label: point.label,
      cells: columns.map((c, i) => ({
        key: c.key,
        label: c.label,
        text:
          values[i] === null ? null : formatLegacyNumber(values[i]!, precision)
      }))
    };
  });

  return { columns, rows };
}

function buildDisplayData(
  frame: VizFrame,
  spec: GraphicSpec
): { columns: DisplayColumn[]; rows: DisplayRow[] } {
  const semantic = buildFromSemanticData(frame);
  if (semantic) return semantic;

  const precision = resolveLegacyPrecision(spec);
  const hasColumnarData =
    !!frame.columns && frame.columns.length > 0 && !!frame.rows;
  return hasColumnarData
    ? buildFromLegacyColumns(frame, precision)
    : buildFromLegacySeries(frame, precision);
}

export default function RankingTable({ frame, spec }: RendererProps) {
  const { rows } = buildDisplayData(frame, spec);

  const { rootRef, rowsPerPage, pageCount, activePage } = useBroadcastTablePage(
    spec,
    rows.length,
    true
  );
  const visibleRows = paginate(rows, rowsPerPage, activePage);

  const rootStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    padding: TABLE_PADDING,
    minWidth: 0,
    minHeight: 0,
    color: palette.textPrimary,
    fontFamily,
    lineHeight: 1.2,
    overflow: 'hidden'
  };

  const listStyle: CSSProperties = {
    flex: '1 1 auto',
    minHeight: 0,
    // No `overflow: auto` — an audience member cannot scroll a broadcast
    // graphic. Rows beyond capacity are paged, not scrolled.
    overflow: 'hidden',
    display: 'grid',
    gridAutoRows: RANKING_ROW_HEIGHT,
    alignContent: 'start',
    gap: RANKING_ROW_GAP
  };

  const rankFontSize = 28;
  const labelFontSize = 24;
  const statFontSize = 24;
  const rowPadding = '8px 12px';

  if (rows.length === 0) {
    return (
      <div ref={rootRef} style={rootStyle}>
        <div style={{ color: palette.textSecondary, fontSize: labelFontSize }}>
          {frame.emptyReason ?? 'No data available'}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} style={rootStyle}>
      <div
        role='list'
        aria-label={spec.title || frame.title || 'Ranking'}
        style={listStyle}
      >
        {visibleRows.map((row) => {
          // Ramp position is purely a color accent, keyed to the row's
          // position WITHIN the current page — it never feeds the rank
          // label itself, which always comes from `row.rank`. A grouped row
          // (`teamsInMatchId` was used) replaces the ramp with its alliance
          // color instead — see the component doc comment.
          const rampIndex = visibleRows.indexOf(row);
          const accent = row.group
            ? allianceColor(row.group)
            : rampColor(rampIndex, visibleRows.length);
          return (
            <div
              key={row.id}
              role='listitem'
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minWidth: 0,
                height: RANKING_ROW_HEIGHT,
                padding: rowPadding,
                boxSizing: 'border-box',
                backgroundColor: 'rgba(0, 0, 0, 0.55)',
                borderLeft: `${vw(0.4)}px solid ${accent}`,
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: vw(0.3)
              }}
            >
              <div
                style={{
                  ...textStrokeStyle,
                  fontSize: rankFontSize,
                  fontWeight: 800,
                  color: accent,
                  minWidth: vw(2.4),
                  textAlign: 'right',
                  flex: '0 0 auto'
                }}
              >
                {row.rank}
              </div>
              <div
                style={{
                  fontSize: labelFontSize,
                  fontWeight: 700,
                  flex: '1.5 1 0',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {row.label}
              </div>
              {row.cells.map((cell) => (
                <div
                  key={cell.key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    minWidth: 0,
                    flex: '1 1 0',
                    overflow: 'hidden'
                  }}
                >
                  {row.cells.length > 1 && (
                    <span
                      style={{
                        fontSize: 16,
                        color: palette.textSecondary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {cell.label}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: statFontSize,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      fontWeight: 800,
                      color:
                        cell.text === null
                          ? palette.nullNeutral
                          : palette.textPrimary
                    }}
                  >
                    {cell.text === null ? '—' : cell.text}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <BroadcastPageIndicator pageCount={pageCount} activePage={activePage} />
    </div>
  );
}
