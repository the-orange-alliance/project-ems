import type { CSSProperties, ReactNode } from 'react';
import type { VizFrame, GraphicSpec, MeasureFormat } from '@toa-lib/models';
import {
  allianceColor,
  fontFamily,
  palette,
  overlayCardStyle
} from '../theme.js';
import { vh, vw } from '../composition.js';
import {
  formatLegacyCell,
  formatTypedCell,
  legacyRowAllianceGroup,
  paginate,
  resolveLegacyPrecision,
  resolveChartFormat,
  formatChartValue
} from './presentation-format.js';
import type { SemanticCell } from '@toa-lib/models/seasons/stats/presentation';
import {
  BroadcastPageIndicator,
  TABLE_PADDING,
  TABLE_HEADER_HEIGHT,
  TABLE_ROW_HEIGHT,
  useBroadcastTablePage
} from './broadcast-table-layout.js';

/**
 * `table` renderer — the universal fallback.
 *
 * Renders `frame.columns` + `frame.rows` when present; otherwise derives a
 * two-column (label / value) table from `frame.series`. Pages automatically
 * rather than overflowing its container, and stays legible at small
 * (producer-preview) sizes.
 *
 * `value === null` (series points) and a `null` cell (rows) both mean
 * explicitly missing data and are always rendered as an em-dash in
 * `palette.nullNeutral` — never coerced to zero.
 *
 * ALLIANCE GROUPING (Phase 2 of `teamsInMatchId`, modular/opt-in — see
 * `legacyRowAllianceGroup` and `bar-chart.tsx`'s fuller doc comment for the
 * shared contract). Only for the columnar (`frame.columns`/`frame.rows`)
 * path — the `frame.series`-derived fallback below it never carries a
 * `__group`. Both options apply here: (1) each row gets a thin colored left
 * accent instead of a full background tint, so on-air text over the glass
 * panel stays fully legible either way; (2) rows cluster red-alliance
 * before blue-alliance, with a brighter top border marking the boundary.
 */

interface RendererProps {
  frame: VizFrame;
  spec: GraphicSpec;
}

interface Column {
  key: string;
  label: string;
  align?: 'left' | 'right';
  format?: MeasureFormat;
}

type CellValue = unknown;

function renderCell(
  value: CellValue,
  precision: number,
  format?: MeasureFormat
): ReactNode {
  if (value === null)
    return <span style={{ color: palette.nullNeutral }}>&mdash;</span>;
  return format
    ? formatTypedCell(value as SemanticCell, format)
    : formatLegacyCell(value, precision);
}

export default function DataTable({ frame, spec }: RendererProps) {
  const precision = resolveLegacyPrecision(spec);

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
    overflow: 'hidden'
  };

  const contentStyle: CSSProperties = {
    ...overlayCardStyle,
    flex: '1 1 auto',
    minHeight: 0,
    overflow: 'hidden',
    boxSizing: 'border-box',
    minWidth: 0
  };

  const cellFontSize = 22;
  const headerFontSize = 20;
  const cellPadding = '0 12px';

  const tableStyle: CSSProperties = {
    width: '100%',
    tableLayout: 'fixed',
    borderCollapse: 'collapse',
    fontSize: cellFontSize
  };

  const headerCellStyle: CSSProperties = {
    background: palette.scrim,
    color: palette.textSecondary,
    fontSize: headerFontSize,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    padding: cellPadding,
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '28px'
  };

  const bodyCellStyle: CSSProperties = {
    padding: cellPadding,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    lineHeight: '28px'
  };

  const hasColumnarData =
    !!frame.columns && frame.columns.length > 0 && !!frame.rows;

  const rowGroups = new Map<
    Record<string, unknown>,
    'red' | 'blue' | undefined
  >();
  const rowGroup = (row: Record<string, unknown>) =>
    rowGroups.has(row) ? rowGroups.get(row) : legacyRowAllianceGroup(row);
  let columns: Column[];
  let rows: Record<string, CellValue>[];

  const semantic =
    frame.data?.kind === 'table' || frame.data?.kind === 'ranking-table'
      ? frame.data
      : undefined;
  if (semantic) {
    // Choose a collision-free identity key without changing semantic columns/cells.
    let identityKey = '__entity';
    while (semantic.columns.some((column) => column.id === identityKey))
      identityKey += '_';
    columns = [
      { key: identityKey, label: 'Entity', align: 'left' },
      ...semantic.columns.map((column) => ({ ...column, key: column.id }))
    ];
    rows = semantic.rows.map((row) => {
      const cells = { ...row.cells, [identityKey]: row.label };
      rowGroups.set(cells, row.group);
      return cells;
    });
  } else if (hasColumnarData) {
    columns = frame.columns as Column[];
    const rawRows = frame.rows as Record<string, CellValue>[];
    rows = rawRows;
  } else {
    columns = [
      { key: 'label', label: frame.axis?.xLabel ?? 'Label', align: 'left' },
      { key: 'value', label: frame.axis?.yLabel ?? 'Value', align: 'right' }
    ];
    rows = frame.series.flatMap((series, seriesIndex) =>
      series.points.map((point) => ({
        label: series.name ? `${series.name} — ${point.label}` : point.label,
        value:
          point.value === null
            ? null
            : formatChartValue(
                point.value,
                resolveChartFormat(frame, spec, seriesIndex)
              )
      }))
    );
  }

  const groupOrder = (row: Record<string, unknown>) => {
    const group = rowGroup(row);
    return group === 'red' ? 0 : group === 'blue' ? 1 : 2;
  };
  rows = [...rows].sort((a, b) => groupOrder(a) - groupOrder(b));
  const { rootRef, rowsPerPage, pageCount, activePage } = useBroadcastTablePage(
    spec,
    rows.length
  );
  const visibleRows = paginate(rows, rowsPerPage, activePage);

  return (
    <div ref={rootRef} style={rootStyle}>
      <div style={contentStyle}>
        {rows.length === 0 || columns.length === 0 ? (
          <div
            style={{
              color: palette.textSecondary,
              fontSize: cellFontSize,
              padding: `${vh(1)}px ${vw(1)}px`
            }}
          >
            {frame.emptyReason ?? 'No data available'}
          </div>
        ) : (
          <table
            aria-label={spec.title || frame.title || 'Data'}
            style={tableStyle}
          >
            <thead>
              <tr style={{ height: TABLE_HEADER_HEIGHT }}>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope='col'
                    title={column.label}
                    style={{
                      ...headerCellStyle,
                      textAlign: column.align ?? 'left'
                    }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, rowIndex) => {
                const group = rowGroup(row as Record<string, unknown>);
                // The cluster boundary (Option 2): a brighter top border on
                // the first row whose alliance differs from the row before
                // it - only ever fires once, right at the red/blue seam.
                const previousGroup =
                  activePage * rowsPerPage + rowIndex > 0
                    ? rowGroup(
                        rows[activePage * rowsPerPage + rowIndex - 1] as Record<
                          string,
                          unknown
                        >
                      )
                    : undefined;
                const isClusterBoundary =
                  group !== undefined &&
                  previousGroup !== undefined &&
                  group !== previousGroup;
                return (
                  <tr
                    key={activePage * rowsPerPage + rowIndex}
                    style={{ height: TABLE_ROW_HEIGHT }}
                  >
                    {columns.map((column, columnIndex) => {
                      const align =
                        column.align ??
                        (typeof row[column.key] === 'number'
                          ? 'right'
                          : 'left');
                      return (
                        <td
                          key={column.key}
                          title={
                            column.format
                              ? formatTypedCell(
                                  (row[column.key] ?? null) as SemanticCell,
                                  column.format
                                )
                              : formatLegacyCell(row[column.key], precision)
                          }
                          style={{
                            ...bodyCellStyle,
                            textAlign: align,
                            // Option 1: a thin colored accent rather than a
                            // full row tint, so on-air text stays fully
                            // legible over the glass panel either way.
                            ...(columnIndex === 0 && group
                              ? {
                                  borderLeft: `4px solid ${allianceColor(group)}`
                                }
                              : {}),
                            ...(isClusterBoundary
                              ? {
                                  borderTop: `2px solid ${palette.textSecondary}`
                                }
                              : {})
                          }}
                        >
                          {renderCell(
                            row[column.key] ?? null,
                            precision,
                            column.format
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <BroadcastPageIndicator pageCount={pageCount} activePage={activePage} />
    </div>
  );
}
