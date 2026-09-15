import type { CSSProperties } from 'react';
import type { GraphicSpec, VizFrame } from '@toa-lib/models';
import type { SemanticCell } from '@toa-lib/models/seasons/stats/presentation';
import {
  fontFamily,
  palette,
  rampColor,
  overlayCardStyle,
  textStrokeStyle
} from '../theme.js';
import { vh, vw } from '../composition.js';
import {
  formatLegacyNumber,
  formatTypedCell,
  resolveLegacyPrecision
} from './presentation-format.js';

/**
 * `stat-tile` renderer — one or a few big numbers.
 *
 * Prefers the typed v2 payload (`frame.data.kind === 'stat-tile'`): each
 * `values[]` entry carries its own typed cell plus a per-measure
 * `MeasureFormat` (precision/unit/percent scale), so a percentage and a
 * raw count sitting side by side each render honoring their own units
 * rather than one borrowed spec-level precision. Falls back to legacy
 * `frame.series[0].points` (a flat number, formatted via
 * `spec.options.precision`) when the frame has not been migrated.
 *
 *  - zero values -> a single em-dash hero (nothing measured / no series).
 *  - exactly one value -> a single hero number.
 *  - 2+ values (composite stats arrive as 2-4) -> a row of tiles, ramped
 *    across the brand gradient via `rampColor`.
 *
 * A `null` cell means "no observation was made" — explicitly distinct from
 * a measured `0` — and is always rendered as an em-dash in
 * `palette.nullNeutral`, never coerced to zero.
 *
 * Title/subtitle are owned by the composition container
 * (`containers/fullscreen.tsx` etc.) — this renderer never draws
 * `frame.title`/`frame.subtitle` itself, only its own per-value captions.
 */

interface RendererProps {
  frame: VizFrame;
  spec: GraphicSpec;
}

interface Tile {
  id: string;
  label: string;
  /** Formatted display text; `null` means the value itself is `null`
   * (no observation), rendered as an em-dash — never a fabricated "0". */
  text: string | null;
}

function tilesFromFrame(frame: VizFrame, spec: GraphicSpec): Tile[] {
  const semantic = frame.data?.kind === 'stat-tile' ? frame.data : undefined;
  if (semantic) {
    return semantic.values.map((value) => ({
      id: value.id,
      label: value.label,
      text:
        value.value === null
          ? null
          : formatTypedCell(
              value.value as Exclude<SemanticCell, null>,
              value.format
            )
    }));
  }

  // Legacy v1 fallback: frame.series[0].points, a flat number/null with no
  // per-value format — formatted using spec.options.precision.
  const precision = resolveLegacyPrecision(spec);
  const points = frame.series[0]?.points ?? [];
  return points.map((point, index) => ({
    id: `${point.label}-${index}`,
    label: point.label,
    text:
      point.value === null ? null : formatLegacyNumber(point.value, precision)
  }));
}

function ValueDisplay({ tile, style }: { tile: Tile; style?: CSSProperties }) {
  if (tile.text === null) {
    return (
      <span style={{ ...style, color: palette.nullNeutral }}>&mdash;</span>
    );
  }
  return <span style={style}>{tile.text}</span>;
}

export default function StatTile({ frame, spec }: RendererProps) {
  const tiles = tilesFromFrame(frame, spec);

  const rootStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: vh(1.2),
    padding: `${vh(2.5)}px ${vw(2.5)}px`,
    color: palette.textPrimary,
    fontFamily,
    textAlign: 'center',
    overflow: 'hidden'
  };

  const captionStyle: CSSProperties = {
    fontSize: vw(1.2),
    color: palette.textSecondary,
    margin: 0
  };

  if (tiles.length === 0) {
    return (
      <div style={rootStyle}>
        <ValueDisplay
          tile={{ id: 'empty', label: '', text: null }}
          style={{
            ...textStrokeStyle,
            fontSize: vw(7),
            fontWeight: 800,
            lineHeight: 1
          }}
        />
        {frame.emptyReason && (
          <div style={captionStyle}>{frame.emptyReason}</div>
        )}
      </div>
    );
  }

  if (tiles.length === 1) {
    const [tile] = tiles;
    const heroStyle: CSSProperties = {
      ...textStrokeStyle,
      fontSize: vw(8),
      fontWeight: 800,
      lineHeight: 1,
      backgroundImage: tile.text === null ? undefined : palette.gradientCss,
      WebkitBackgroundClip: tile.text === null ? undefined : 'text',
      backgroundClip: tile.text === null ? undefined : 'text',
      color: tile.text === null ? palette.nullNeutral : 'transparent'
    };
    return (
      <div style={rootStyle}>
        <ValueDisplay tile={tile} style={heroStyle} />
        {tile.label && <div style={captionStyle}>{tile.label}</div>}
      </div>
    );
  }

  const tileCount = tiles.length;
  const rowStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
    gap: vw(1.4),
    justifyContent: 'center',
    alignItems: 'stretch'
  };

  const tileStyle: CSSProperties = {
    ...overlayCardStyle,
    flex: `1 1 ${Math.max(18, 90 / tileCount)}%`,
    minWidth: vw(14),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: vh(0.8),
    padding: `${vh(1.8)}px ${vw(1.4)}px`,
    boxSizing: 'border-box'
  };

  return (
    <div style={{ ...rootStyle, gap: vh(1.6) }}>
      <div style={rowStyle}>
        {tiles.map((tile, index) => {
          const accent = rampColor(index, tileCount);
          return (
            <div
              key={tile.id}
              style={{
                ...tileStyle,
                borderTop: `${vh(0.3)}px solid ${accent}`
              }}
            >
              <ValueDisplay
                tile={tile}
                style={{
                  ...textStrokeStyle,
                  fontSize: vw(3.6),
                  fontWeight: 800,
                  lineHeight: 1,
                  color: tile.text === null ? palette.nullNeutral : accent
                }}
              />
              <div
                style={{
                  fontSize: vw(1.05),
                  color: palette.textSecondary,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em',
                  textAlign: 'center'
                }}
              >
                {tile.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
