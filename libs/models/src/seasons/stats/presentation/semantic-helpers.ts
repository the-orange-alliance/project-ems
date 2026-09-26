/** Browser-safe, deterministic building blocks. Season registrations select semantics explicitly. */
import {
  presentationFrameZod,
  preparedGraphicSpecZod,
  SUPPORTED_GRAPHIC_MODES,
  type GraphicKind,
  type GraphicSpec,
  type MeasureFormat,
  type PresentationData,
  type PresentationFrame,
  type PresentationMode,
  type VizFrame
} from '../../../base/Graphics.js';
import type { StatResult } from '../types.js';
import type { AdaptContext } from './adapt-context.js';

export type SemanticCell = string | number | boolean | null;
export interface SemanticMeasure {
  id: string;
  label: string;
  format: MeasureFormat;
  valuePath?: string;
}
export interface SemanticEntity {
  id: string;
  label: string;
}
export interface SemanticManifest {
  catalogueId: string;
  fixtureExpectation: 'nonempty' | 'legitimately-empty' | 'source-failure';
  assertions: string[];
  emptyReason?: string;
}
export interface SemanticMetadata {
  defaultKind: GraphicKind;
  supportedKinds: readonly GraphicKind[];
  modesByKind: Partial<Record<GraphicKind, readonly PresentationMode[]>>;
  measures: readonly SemanticMeasure[];
  defaultMeasureId?: string;
  higherIsBetter?: boolean;
  requiredParams?: readonly string[];
}
export interface SemanticRegistration {
  seasonKey: string;
  catalogueId: string;
  metadata: SemanticMetadata;
  manifest: SemanticManifest;
  adapt(
    result: StatResult,
    spec: GraphicSpec,
    ctx: AdaptContext
  ): PresentationFrame;
}
export class SemanticPreparationError extends Error {
  readonly code = 'PRESENTATION_FAILED';
  constructor(
    message: string,
    readonly sourceStatus?: string
  ) {
    super(message);
    this.name = 'SemanticPreparationError';
  }
}
export function semanticRegistrationKey(
  seasonKey: string,
  catalogueId: string
): string {
  return JSON.stringify([seasonKey, catalogueId]);
}
export function requireOkResult(
  result: StatResult
): Extract<StatResult, { status: 'ok' }> {
  if (result.status !== 'ok')
    throw new SemanticPreparationError(result.reason, result.status);
  return result;
}
export function tableCell(value: unknown, path = 'value'): SemanticCell {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new SemanticPreparationError(
    `${path}: expected a finite number, string, boolean, or null; configure nested extraction explicitly`
  );
}
export function numericCell(value: unknown, path = 'value'): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new SemanticPreparationError(
    `${path}: expected a finite number or null`
  );
}
export function textCell(value: unknown, path = 'value'): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'string') return value;
  throw new SemanticPreparationError(`${path}: expected text or null`);
}
export function booleanNumber(value: unknown, path = 'value'): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  throw new SemanticPreparationError(`${path}: expected boolean or null`);
}
/** JSON tuple encoding prevents collisions caused by separators in external keys. */
export function stableEntityId(
  kind: string,
  ...keys: (string | number)[]
): string {
  if (
    !kind ||
    keys.length === 0 ||
    keys.some((key) => typeof key === 'number' && !Number.isFinite(key))
  ) {
    throw new SemanticPreparationError(
      'Entity identity requires a kind and finite, source-derived keys'
    );
  }
  return JSON.stringify([kind, ...keys]);
}
export function arrayElementId(
  parentId: string,
  path: string,
  sourceIndex: number
): string {
  if (!Number.isInteger(sourceIndex) || sourceIndex < 0)
    throw new SemanticPreparationError(
      'Array identity requires the original nonnegative source index'
    );
  return stableEntityId('element', parentId, path, sourceIndex);
}
export function teamEntity(
  teamKey: number,
  ctx: AdaptContext,
  showTeamNames = true
): SemanticEntity {
  const team = ctx.teams?.find((team) => team.teamKey === teamKey);
  const label = showTeamNames
    ? (team?.teamNameShort ?? team?.teamNumber)
    : (team?.teamNumber ?? team?.teamNameShort);
  return {
    id: stableEntityId('team', teamKey),
    label: label ?? `Team ${teamKey}`
  };
}
export function matchEntity(
  tournamentKey: string,
  matchId: number,
  ctx: AdaptContext
): SemanticEntity {
  const match = ctx.matches?.find(
    (match) => match.tournamentKey === tournamentKey && match.id === matchId
  );
  return {
    id: stableEntityId('match', tournamentKey, matchId),
    label: match?.name ?? `${tournamentKey} · Match ${matchId}`
  };
}
export function numberFormat(precision = 0, unit?: string): MeasureFormat {
  return { style: 'number', scale: 1, precision, ...(unit ? { unit } : {}) };
}
export function percentFormat(
  storage: 'ratio' | 'percent',
  precision = 1
): MeasureFormat {
  return {
    style: 'percent',
    scale: storage === 'ratio' ? 100 : 1,
    precision,
    unit: '%'
  };
}
export function formatSemanticCell(
  value: SemanticCell,
  format: MeasureFormat
): string {
  if (value === null) return '—';
  if (typeof value !== 'number') return String(value);
  const text = (value * format.scale).toFixed(format.precision ?? 0);
  return format.style === 'percent'
    ? `${text}%`
    : format.unit
      ? `${text} ${format.unit}`
      : text;
}
function measurePayload(measure: SemanticMeasure): {
  id: string;
  label: string;
  format: MeasureFormat;
} {
  return { id: measure.id, label: measure.label, format: measure.format };
}
function assertUnique(ids: string[], description: string): void {
  if (new Set(ids).size !== ids.length)
    throw new SemanticPreparationError(
      `${description} must be unique stable IDs`
    );
}
function checkedLimit(limit: number | undefined): number | undefined {
  if (
    limit !== undefined &&
    (!Number.isInteger(limit) || limit < 1 || limit > 10000)
  )
    throw new SemanticPreparationError(
      'Limit must be an integer from 1 to 10000'
    );
  return limit;
}
export function scalarData(
  values: { measure: SemanticMeasure; value: unknown }[]
): Extract<PresentationData, { kind: 'stat-tile' }> {
  return {
    kind: 'stat-tile',
    values: values.map(({ measure, value }) => ({
      ...measurePayload(measure),
      value: tableCell(value, measure.id)
    }))
  };
}
export interface CategoricalInputSeries {
  id: string;
  label: string;
  measure: SemanticMeasure;
  points: { entityId: string; value: number | null }[];
}
/** A single optional domain sort/limit is applied identically to every series. */
export function categoricalData(
  kind: 'bar' | 'grouped-bar',
  entities: SemanticEntity[],
  series: CategoricalInputSeries[],
  options: {
    sort?: { seriesId: string; direction: 'asc' | 'desc' };
    limit?: number;
  } = {}
): Extract<PresentationData, { kind: 'bar' | 'grouped-bar' }> {
  assertUnique(
    entities.map((entity) => entity.id),
    'Entities'
  );
  assertUnique(
    series.map((item) => item.id),
    'Series'
  );
  const domainIds = new Set(entities.map((entity) => entity.id));
  const lookups = new Map(
    series.map((item) => {
      assertUnique(
        item.points.map((point) => point.entityId),
        `Series ${item.id} points`
      );
      for (const point of item.points) {
        numericCell(point.value, `${item.id}/${point.entityId}`);
        if (!domainIds.has(point.entityId))
          throw new SemanticPreparationError(
            `Unknown domain identity ${point.entityId}`
          );
      }
      return [
        item.id,
        new Map(item.points.map((point) => [point.entityId, point.value]))
      ] as const;
    })
  );
  let selected = entities.slice();
  if (options.sort) {
    const values = lookups.get(options.sort.seriesId);
    if (!values)
      throw new SemanticPreparationError(
        `Unknown sort series ${options.sort.seriesId}`
      );
    const direction = options.sort.direction === 'asc' ? 1 : -1;
    selected.sort((a, b) => {
      const av = values.get(a.id) ?? null,
        bv = values.get(b.id) ?? null;
      return av === null
        ? bv === null
          ? 0
          : 1
        : bv === null
          ? -1
          : direction * (av - bv);
    });
  }
  const limit = checkedLimit(options.limit);
  if (limit !== undefined) selected = selected.slice(0, limit);
  return {
    kind,
    entities: selected,
    series: series.map((item) => ({
      id: item.id,
      label: item.label,
      measure: measurePayload(item.measure),
      points: selected.map((entity) => ({
        entityId: entity.id,
        value: lookups.get(item.id)!.get(entity.id) ?? null
      }))
    }))
  };
}
export interface LineInputSeries {
  id: string;
  label: string;
  measure: SemanticMeasure;
  interpolation?: 'linear' | 'step';
  points: { x: number | string; label?: string; value: number | null }[];
}
export function lineData(
  xType: 'number' | 'timestamp',
  series: LineInputSeries[],
  xLabel?: string
): Extract<PresentationData, { kind: 'line' }> {
  assertUnique(
    series.map((item) => item.id),
    'Line series'
  );
  return {
    kind: 'line',
    xType,
    ...(xLabel ? { xLabel } : {}),
    series: series.map((item) => ({
      id: item.id,
      label: item.label,
      measure: measurePayload(item.measure),
      interpolation: item.interpolation ?? 'linear',
      points: item.points
        .map((point) => {
          const x =
            typeof point.x === 'number'
              ? point.x
              : xType === 'timestamp'
                ? Date.parse(point.x)
                : NaN;
          if (!Number.isFinite(x))
            throw new SemanticPreparationError(
              `Series ${item.id} contains an invalid ${xType} coordinate`
            );
          return {
            x,
            value: numericCell(point.value),
            ...(point.label !== undefined ? { label: point.label } : {})
          };
        })
        .sort((a, b) => a.x - b.x)
    }))
  };
}
export function histogramData(
  measure: SemanticMeasure,
  bins: {
    id: string;
    label: string;
    lower: number | null;
    upper: number | null;
    value: number | null;
  }[]
): Extract<PresentationData, { kind: 'histogram' }> {
  assertUnique(
    bins.map((bin) => bin.id),
    'Histogram bins'
  );
  for (const bin of bins) {
    numericCell(bin.lower);
    numericCell(bin.upper);
    numericCell(bin.value);
    if (bin.lower !== null && bin.upper !== null && bin.lower > bin.upper)
      throw new SemanticPreparationError(
        `Invalid histogram bounds for ${bin.id}`
      );
  }
  return {
    kind: 'histogram',
    measure: measurePayload(measure),
    bins: bins.map((bin) => ({ ...bin }))
  };
}
export interface SemanticTableRow {
  id: string;
  label: string;
  rank?: number;
  cells: Record<string, SemanticCell>;
}
export function tableData(
  kind: 'table' | 'ranking-table',
  columns: SemanticMeasure[],
  rows: SemanticTableRow[]
): Extract<PresentationData, { kind: 'table' | 'ranking-table' }> {
  assertUnique(
    columns.map((column) => column.id),
    'Table columns'
  );
  assertUnique(
    rows.map((row) => row.id),
    'Table rows'
  );
  const columnIds = new Set(columns.map((column) => column.id));
  return {
    kind,
    columns: columns.map(measurePayload),
    rows: rows.map((row) => {
      if (Object.keys(row.cells).some((key) => !columnIds.has(key)))
        throw new SemanticPreparationError(
          `Row ${row.id} contains an undeclared cell column`
        );
      if (
        kind === 'ranking-table' &&
        (!Number.isInteger(row.rank) || row.rank! < 1)
      )
        throw new SemanticPreparationError(
          `Row ${row.id} requires its source rank`
        );
      return {
        id: row.id,
        label: row.label,
        ...(row.rank !== undefined ? { rank: row.rank } : {}),
        cells: Object.fromEntries(
          columns.map((column) => [
            column.id,
            tableCell(row.cells[column.id], `${row.id}/${column.id}`)
          ])
        )
      };
    })
  };
}
/** Exactly one explicit nested-array expansion; no heuristic object scanning or silent coercion. */
export function flattenTableRows<Parent, Child>(
  parents: readonly Parent[],
  config: {
    parentId(parent: Parent, index: number): string;
    path: string;
    children(parent: Parent): readonly Child[];
    row(
      child: Child,
      parent: Parent,
      sourceIndex: number
    ): Omit<SemanticTableRow, 'id'> & { id?: string };
  }
): SemanticTableRow[] {
  return parents.flatMap((parent, parentIndex) => {
    const parentId = config.parentId(parent, parentIndex);
    const children = config.children(parent);
    if (!Array.isArray(children))
      throw new SemanticPreparationError(
        `${config.path}: expected an explicitly selected array`
      );
    return children.map((child, sourceIndex) => {
      const row = config.row(child, parent, sourceIndex);
      return {
        ...row,
        id: row.id ?? arrayElementId(parentId, config.path, sourceIndex)
      };
    });
  });
}

function legacyBridge(
  data: PresentationData
): Pick<VizFrame, 'series' | 'rows' | 'columns' | 'axis'> {
  switch (data.kind) {
    case 'stat-tile':
      return {
        series: data.values.map((item) => ({
          name: item.label,
          points: [
            {
              label: item.label,
              value: typeof item.value === 'number' ? item.value : null,
              meta: { id: item.id, rawValue: item.value }
            }
          ]
        }))
      };
    case 'bar':
    case 'grouped-bar': {
      const entities = new Map(
        data.entities.map((entity) => [entity.id, entity])
      );
      return {
        series: data.series.map((item) => ({
          name: item.label,
          points: item.points.map((point) => {
            const entity = entities.get(point.entityId)!;
            // `group` (Phase 2's `teamsInMatchId` alliance coloring - see
            // `applyAllianceGroups`) rides along in `meta` purely so a legacy
            // `frame.series`-driven renderer (e.g. `bar-chart.tsx`) can read it;
            // it is absent whenever `applyAllianceGroups` never ran.
            return {
              label: entity.label,
              value: point.value,
              meta: {
                id: point.entityId,
                ...(entity.group ? { group: entity.group } : {})
              }
            };
          })
        })),
        axis: { xType: 'category' }
      };
    }
    case 'line':
      return {
        series: data.series.map((item) => ({
          name: item.label,
          points: item.points.map((point) => ({
            label: String(point.x),
            value: point.value,
            meta: {
              seriesId: item.id,
              x: point.x,
              displayLabel: point.label ?? String(point.x)
            }
          }))
        })),
        axis: {
          xType: data.xType === 'timestamp' ? 'time' : 'value',
          xLabel: data.xLabel
        }
      };
    case 'histogram':
      return {
        series: [
          {
            name: data.measure.label,
            points: data.bins.map((bin) => ({
              label: bin.label,
              value: bin.value,
              meta: { id: bin.id, lower: bin.lower, upper: bin.upper }
            }))
          }
        ],
        axis: { xType: 'category' }
      };
    case 'table':
    case 'ranking-table':
      return {
        series: [],
        columns: [
          { key: '__entity', label: 'Entity' },
          ...(data.kind === 'ranking-table'
            ? [{ key: '__rank', label: 'Rank' }]
            : []),
          ...data.columns.map((column) => ({
            key: column.id,
            label: column.label
          }))
        ],
        // `__group` mirrors `row.group` (Phase 2's `teamsInMatchId` alliance
        // coloring) for a legacy `frame.rows`-driven renderer; absent
        // whenever `applyAllianceGroups` never ran, exactly like `bar`/
        // `grouped-bar`'s `meta.group` above.
        rows: data.rows.map((row) => ({
          ...row.cells,
          __entity: row.label,
          __id: row.id,
          ...(row.rank !== undefined ? { __rank: row.rank } : {}),
          ...(row.group !== undefined ? { __group: row.group } : {})
        }))
      };
    case 'geo-map':
      return {
        series: [
          {
            name: data.measure.label,
            points: data.countries.map((country) => ({
              label: country.label,
              value: country.value,
              meta: { countryCode: country.countryCode }
            }))
          }
        ]
      };
    case 'heatmap':
      return {
        series: [],
        columns: [
          { key: 'xId', label: 'X' },
          { key: 'yId', label: 'Y' },
          { key: 'value', label: data.measure.label }
        ],
        rows: data.cells.map((cell) => ({ ...cell }))
      };
  }
}
/** teamKey -> alliance for one match's roster; `undefined` when the match or a readable roster for it isn't available in `ctx`. */
function allianceByTeamKey(
  ctx: AdaptContext,
  matchId: number
): Map<number, 'red' | 'blue'> | undefined {
  const match = ctx.matches?.find((m) => m.id === matchId);
  if (!match?.participants?.length) return undefined;
  return new Map(
    match.participants.map((p) => [
      p.teamKey,
      p.station < 20 ? ('red' as const) : ('blue' as const)
    ])
  );
}
/** The ONLY entity id shape this recognizes is `stableEntityId('team', teamKey)`'s own `["team", teamKey]` encoding - a match/element/other-kind id (or a malformed one) is left ungrouped, never throws. */
function teamKeyFromEntityId(id: string): number | undefined {
  try {
    const parsed: unknown = JSON.parse(id);
    return Array.isArray(parsed) &&
      parsed.length === 2 &&
      parsed[0] === 'team' &&
      typeof parsed[1] === 'number'
      ? parsed[1]
      : undefined;
  } catch {
    return undefined;
  }
}
/**
 * Colors/groups a `bar`/`grouped-bar`/`table`/`ranking-table` frame's
 * entities or rows by alliance (red/blue) - ONLY when the graphic's OWN
 * `selectors.teamsInMatchId` named the match its team list came from. Modular
 * and opt-in per spec: never touches a plain single-`teamKey` selection or an
 * event-wide "all teams" leaderboard (both leave `teamsInMatchId` unset), and
 * never touches `stat-tile`/`line`/`histogram`/`heatmap`/`geo-map` - none of
 * those kinds have a natural multi-team layout for this to group. Never
 * throws: a missing match, an unreadable roster, or a non-team entity/row id
 * just leaves that entity/row ungrouped rather than failing the whole frame.
 */
function applyAllianceGroups(
  data: PresentationData,
  spec: GraphicSpec,
  ctx: AdaptContext
): PresentationData {
  const matchId = spec.selectors.teamsInMatchId;
  if (matchId === undefined) return data;
  if (
    data.kind !== 'bar' &&
    data.kind !== 'grouped-bar' &&
    data.kind !== 'table' &&
    data.kind !== 'ranking-table'
  )
    return data;
  const alliances = allianceByTeamKey(ctx, matchId);
  if (!alliances) return data;
  if (data.kind === 'bar' || data.kind === 'grouped-bar') {
    return {
      ...data,
      entities: data.entities.map((entity) => {
        const teamKey = teamKeyFromEntityId(entity.id);
        const group =
          teamKey !== undefined ? alliances.get(teamKey) : undefined;
        return group ? { ...entity, group } : entity;
      })
    };
  }
  return {
    ...data,
    rows: data.rows.map((row) => {
      const teamKey = teamKeyFromEntityId(row.id);
      const group = teamKey !== undefined ? alliances.get(teamKey) : undefined;
      return group ? { ...row, group } : row;
    })
  };
}
export function createSemanticFrame(
  spec: GraphicSpec,
  ctx: AdaptContext,
  result: Extract<StatResult, { status: 'ok' }>,
  data: PresentationData,
  options: { emptyReason?: string; notes?: string[]; warnings?: string[] } = {}
): PresentationFrame {
  const parsedSpec = preparedGraphicSpecZod.safeParse(spec);
  if (!parsedSpec.success)
    throw new SemanticPreparationError(
      `${ctx.catalogueId}: invalid or unresolved graphic specification`
    );
  if (!SUPPORTED_GRAPHIC_MODES[spec.kind].includes(spec.mode))
    throw new SemanticPreparationError(`Unsupported ${spec.kind}/${spec.mode}`);
  if (spec.kind !== data.kind)
    throw new SemanticPreparationError(
      `Requested ${spec.kind}, adapter produced ${data.kind}`
    );
  const grouped = applyAllianceGroups(data, spec, ctx);
  const parsed = presentationFrameZod.safeParse({
    schemaVersion: 2,
    kind: grouped.kind,
    title: spec.title,
    ...(spec.subtitle !== undefined ? { subtitle: spec.subtitle } : {}),
    asOfUtc: ctx.asOfUtc,
    quality: result.quality,
    warnings: [...result.warnings, ...(options.warnings ?? [])],
    ...legacyBridge(grouped),
    data: grouped,
    ...(options.emptyReason ? { emptyReason: options.emptyReason } : {}),
    ...(options.notes ? { notes: options.notes } : {})
  });
  if (!parsed.success)
    throw new SemanticPreparationError(
      `${ctx.catalogueId}: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`
    );
  return parsed.data;
}
