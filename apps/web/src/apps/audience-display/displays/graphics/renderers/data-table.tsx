import type { CSSProperties, ReactNode } from 'react';
import type { VizFrame, GraphicSpec } from '@toa-lib/models';
import {
  allianceColor,
  fontFamily,
  palette,
  overlayCardStyle,
  textStrokeStyle
} from '../theme.js';
import { vh, vw } from '../composition.js';
import { legacyRowAllianceGroup } from './presentation-format.js';

/**
 * `table` renderer — the universal fallback.
 *
 * Renders `frame.columns` + `frame.rows` when present; otherwise derives a
 * two-column (label / value) table from `frame.series`. Scrolls internally
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
}

type CellValue = unknown;

function resolvePrecision(spec: GraphicSpec): number {
  const precision = spec.options?.precision;
  return typeof precision === 'number' && Number.isFinite(precision)
    ? precision
    : 1;
}

function formatNumber(value: number, precision: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  });
}

function renderCell(value: CellValue, precision: number): ReactNode {
  if (value === null) {
    return <span style={{ color: palette.nullNeutral }}>&mdash;</span>;
  }
  if (typeof value === 'number') {
    return formatNumber(value, precision);
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'string') {
    return value;
  }
  // Arrays / nested objects are not expected on-air, but render something
  // sane rather than crashing.
  return JSON.stringify(value);
}

export default function DataTable({ frame, spec }: RendererProps) {
  const precision = resolvePrecision(spec);

  const rootStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    padding: `${vh(2)}px ${vw(2)}px`,
    color: palette.textPrimary,
    fontFamily,
    overflow: 'hidden'
  };

  const titleStyle: CSSProperties = {
    ...textStrokeStyle,
    fontSize: vw(2),
    fontWeight: 700,
    marginBottom: vh(1.2),
    flex: '0 0 auto'
  };

  const scrollStyle: CSSProperties = {
    ...overlayCardStyle,
    flex: '1 1 auto',
    minHeight: 0,
    overflow: 'auto',
    boxSizing: 'border-box',
    padding: `${vh(0.8)}px ${vw(1)}px`
  };

  const cellFontSize = vw(1.15);
  const headerFontSize = vw(1.05);
  const cellPadding = `${vh(0.7)}px ${vw(1)}px`;

  const tableStyle: CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: cellFontSize
  };

  const headerCellStyle: CSSProperties = {
    position: 'sticky',
    top: 0,
    background: palette.scrim,
    color: palette.textSecondary,
    fontSize: headerFontSize,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
    padding: cellPadding,
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    whiteSpace: 'nowrap'
  };

  const bodyCellStyle: CSSProperties = {
    padding: cellPadding,
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    whiteSpace: 'nowrap'
  };

  const hasColumnarData =
    !!frame.columns && frame.columns.length > 0 && !!frame.rows;

  let columns: Column[];
  let rows: Record<string, CellValue>[];

  if (hasColumnarData) {
    columns = frame.columns as Column[];
    const rawRows = frame.rows as Record<string, CellValue>[];
    const rawGroups = rawRows.map((row) =>
      legacyRowAllianceGroup(row as Record<string, unknown>)
    );
    // Cluster red-alliance before blue-alliance ONLY once at least one row
    // is actually grouped - stable within each cluster.
    rows = rawGroups.some((g) => g !== undefined)
      ? rawRows
          .map((row, i) => ({ row, i, group: rawGroups[i] }))
          .sort((a, b) => {
            const rank = (g: 'red' | 'blue' | undefined) =>
              g === 'red' ? 0 : g === 'blue' ? 1 : 2;
            return rank(a.group) - rank(b.group) || a.i - b.i;
          })
          .map(({ row }) => row)
      : rawRows;
  } else {
    columns = [
      { key: 'label', label: frame.axis?.xLabel ?? 'Label', align: 'left' },
      { key: 'value', label: frame.axis?.yLabel ?? 'Value', align: 'right' }
    ];
    rows = frame.series.flatMap((series) =>
      series.points.map((point) => ({
        label: series.name ? `${series.name} — ${point.label}` : point.label,
        value: point.value
      }))
    );
  }

  return (
    <div style={rootStyle}>
      <div style={titleStyle}>{frame.title}</div>
      <div style={scrollStyle}>
        {rows.length === 0 || columns.length === 0 ? (
          <div
            style={{
              color: palette.textSecondary,
              fontSize: cellFontSize,
              padding: `${vh(1)}px ${vw(1)}px`
            }}
          >
            No data available
          </div>
        ) : (
          <table style={tableStyle}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
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
              {rows.map((row, rowIndex) => {
                const group = legacyRowAllianceGroup(
                  row as Record<string, unknown>
                );
                // The cluster boundary (Option 2): a brighter top border on
                // the first row whose alliance differs from the row before
                // it - only ever fires once, right at the red/blue seam.
                const previousGroup =
                  rowIndex > 0
                    ? legacyRowAllianceGroup(
                        rows[rowIndex - 1] as Record<string, unknown>
                      )
                    : undefined;
                const isClusterBoundary =
                  group !== undefined &&
                  previousGroup !== undefined &&
                  group !== previousGroup;
                return (
                  <tr key={rowIndex}>
                    {columns.map((column, columnIndex) => {
                      const align =
                        column.align ??
                        (typeof row[column.key] === 'number'
                          ? 'right'
                          : 'left');
                      return (
                        <td
                          key={column.key}
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
                          {renderCell(row[column.key] ?? null, precision)}
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
    </div>
  );
}
