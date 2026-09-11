/**
 * Pure functions that turn a raw `StatResult` into a render-ready `VizFrame`.
 *
 * This module is called from exactly two places at runtime: the on-air
 * audience display and the producer's preview pane. Both call the SAME
 * `adaptResult` function against the SAME `StatResult` — that shared call is
 * the only thing guaranteeing the producer's preview matches what airs. So:
 *
 *   - No I/O, no `Date.now()`, no randomness, no mutation of inputs. Same
 *     inputs -> same output, always (a test asserts this by calling twice
 *     and deep-comparing).
 *   - A failed `StatResult` (status !== 'ok') degrades to a valid, empty
 *     `VizFrame` — it must never throw. A bug here would otherwise crash the
 *     broadcast overlay live.
 *   - `null` in the source data means "no observation was made" and is
 *     always distinct from a measured zero. It is never coerced to 0 — a
 *     renderer draws a `null` point as a gap / em-dash, not a bar of height
 *     zero.
 *
 * The shape of `data` for a given catalogue id is documented in
 * `../result-schemas.ts`; the "how to draw it" metadata (which family, which
 * fields, units, precision) comes from `./families.ts` + `./presentation.ts`.
 */

import { familyFor, type VizFamily } from './families.js';
import { presentationFor } from './presentation.js';
import type { GraphicSpec, VizFrame } from '../../../base/Graphics.js';
import type { Json, StatResult } from '../types.js';

export interface AdaptContext {
  catalogueId: string;
  teams?: { teamKey: number; teamNumber?: string; teamNameShort?: string }[];
  /**
   * `participants` is optional and only ever read by `applyAllianceGroups`
   * (see `semantic-helpers.ts`) to color/group a `teamsInMatchId` graphic by
   * alliance - every other consumer of `matches` (labels, etc.) ignores it.
   * A caller that never populates it just means that graphic never gets
   * alliance grouping, never a crash - see each `LoadEntities`/data-source
   * implementation for whether it's populated.
   */
  matches?: {
    tournamentKey: string;
    id: number;
    name?: string;
    participants?: { teamKey: number; station: number }[];
  }[];
  asOfUtc: string;
}

type Point = VizFrame['series'][number]['points'][number];
type Series = VizFrame['series'];

// ---------------------------------------------------------------------------
// Core value / label helpers shared by every family
// ---------------------------------------------------------------------------

/**
 * Coerce an arbitrary JSON value found on a row into the `number | null`
 * that a `VizFrame` point can carry. `null`/`undefined` -> `null` (never a
 * fabricated zero). Booleans map to 1/0 (a real, meaningful measurement, not
 * a stand-in for "missing"). Non-finite numbers, strings, arrays, and plain
 * objects (other than a `{ score: number }` shape used by a few "best/worst
 * match" records) resolve to `null` rather than throwing or producing NaN.
 */
function resolveValue(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  if (typeof raw === 'boolean') return raw ? 1 : 0;
  if (Array.isArray(raw)) return null;
  if (typeof raw === 'object') {
    const { score } = raw as Record<string, unknown>;
    if (typeof score === 'number' && Number.isFinite(score)) return score;
    return null;
  }
  return null;
}

/**
 * Look up a named field on a row, checking a nested `value` record first
 * (the common `teamRows(object({...}))` / `matchRows(object({...}))` shape)
 * and falling back to the field living directly on the row (the flat shape
 * used by a handful of ids, e.g. D4, K10, K13). Returns `undefined` — never
 * throws — when neither location has the field.
 */
function extractRaw(row: unknown, field: string): unknown {
  if (!row || typeof row !== 'object') return undefined;
  const r = row as Record<string, unknown>;
  const nested = r.value;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const nestedRecord = nested as Record<string, unknown>;
    if (field in nestedRecord) return nestedRecord[field];
  }
  if (field in r) return r[field];
  return undefined;
}

function buildMeta(row: unknown): Json | undefined {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return undefined;
  const r = row as Record<string, unknown>;
  const meta: Record<string, Json> = {};
  if (typeof r.teamKey === 'number') meta.teamKey = r.teamKey;
  if (typeof r.allianceSeed === 'number') meta.allianceSeed = r.allianceSeed;
  if (typeof r.tournamentKey === 'string') meta.tournamentKey = r.tournamentKey;
  if (typeof r.matchId === 'number') meta.matchId = r.matchId;
  return Object.keys(meta).length ? meta : undefined;
}

/** A row from one of the A16/A18/A19/A42 failure-union arrays. */
function isFailureRow(
  row: unknown
): row is Record<string, unknown> & { status: string; reason?: string } {
  return (
    !!row &&
    typeof row === 'object' &&
    !Array.isArray(row) &&
    'status' in row &&
    (row as Record<string, unknown>).status !== 'ok'
  );
}

function labelForTeam(
  teamKey: number,
  ctx: AdaptContext,
  showTeamNames: boolean | undefined
): string {
  const team = ctx.teams?.find((t) => t.teamKey === teamKey);
  if (!team) return `Team ${teamKey}`;
  if (showTeamNames)
    return team.teamNameShort ?? team.teamNumber ?? `Team ${teamKey}`;
  return team.teamNumber ?? team.teamNameShort ?? `Team ${teamKey}`;
}

function labelForTeamRow(
  row: unknown,
  ctx: AdaptContext,
  showTeamNames: boolean | undefined,
  i: number
): string {
  if (
    row &&
    typeof row === 'object' &&
    typeof (row as Record<string, unknown>).teamKey === 'number'
  ) {
    return labelForTeam(
      (row as Record<string, unknown>).teamKey as number,
      ctx,
      showTeamNames
    );
  }
  return `Row ${i + 1}`;
}

function labelForMatch(
  tournamentKey: string,
  matchId: number,
  ctx: AdaptContext
): string {
  const match = ctx.matches?.find(
    (m) => m.tournamentKey === tournamentKey && m.id === matchId
  );
  if (match?.name) return match.name;
  return `Match ${matchId}`;
}

function labelForMatchRow(row: unknown, ctx: AdaptContext, i: number): string {
  if (row && typeof row === 'object') {
    const r = row as Record<string, unknown>;
    if (typeof r.tournamentKey === 'string' && typeof r.matchId === 'number') {
      return labelForMatch(r.tournamentKey, r.matchId, ctx);
    }
    if (typeof r.matchKey === 'string') return r.matchKey;
  }
  return `Row ${i + 1}`;
}

function labelForAllianceRow(
  row: unknown,
  ctx: AdaptContext,
  showTeamNames: boolean | undefined,
  i: number
): string {
  if (row && typeof row === 'object') {
    const r = row as Record<string, unknown>;
    if (typeof r.allianceSeed === 'number') return `Alliance ${r.allianceSeed}`;
    if (typeof r.teamKey === 'number')
      return labelForTeam(r.teamKey, ctx, showTeamNames);
  }
  return `Row ${i + 1}`;
}

function labelForCategoricalRow(row: unknown, i: number): string {
  if (row && typeof row === 'object') {
    const r = row as Record<string, unknown>;
    for (const key of [
      'actorId',
      'group',
      'fieldClient',
      'tournamentType',
      'tournamentKey'
    ]) {
      if (typeof r[key] === 'string') return r[key] as string;
    }
    if (typeof r.fieldNumber === 'number') return `Field ${r.fieldNumber}`;
  }
  return `Row ${i + 1}`;
}

/**
 * Sort points by value with nulls always last (in both directions), then
 * apply a top-N limit. Never mutates the input array.
 */
function applySortAndLimit(
  points: Point[],
  sortDir: 'asc' | 'desc' | undefined,
  limit: number | undefined
): Point[] {
  let out = points;
  if (sortDir) {
    out = [...points].sort((a, b) => {
      if (a.value === null && b.value === null) return 0;
      if (a.value === null) return 1;
      if (b.value === null) return -1;
      return sortDir === 'asc' ? a.value - b.value : b.value - a.value;
    });
  }
  if (typeof limit === 'number' && limit >= 0) {
    out = out.slice(0, limit);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Shared row -> series builder, used by teamRows, teamRowsRecord, oprTable's
// team list, matchRows, allianceRows, and categorical.
// ---------------------------------------------------------------------------

/**
 * Builds one series per field name in `fieldNames` (falling back to the
 * single generic `value` field when the presentation declares none), one
 * point per row. Rows carrying a non-'ok' `status` (the A16/A18/A19/A42
 * failure-union rows) are excluded from every series and instead recorded
 * as a readable line in `notes`.
 */
function buildKeyedSeries(
  data: unknown,
  fieldNames: string[],
  labelFn: (row: unknown, i: number) => string,
  notes: string[]
): Series {
  const rows = Array.isArray(data) ? data : [];
  const fields = fieldNames.length ? fieldNames : ['value'];
  const kept: { row: unknown; label: string }[] = [];

  rows.forEach((row, i) => {
    if (isFailureRow(row)) {
      const reason =
        typeof row.reason === 'string' ? row.reason : String(row.status);
      notes.push(`${labelFn(row, i)}: ${reason}`);
      return;
    }
    kept.push({ row, label: labelFn(row, i) });
  });

  return fields.map((field) => ({
    name: field === 'value' ? undefined : field,
    points: kept.map(({ row, label }) => ({
      label,
      value: resolveValue(extractRaw(row, field)),
      meta: buildMeta(row)
    }))
  }));
}

// ---------------------------------------------------------------------------
// scalar
// ---------------------------------------------------------------------------

function adaptScalar(data: unknown, valueLabel: string): Series {
  return [{ points: [{ label: valueLabel, value: resolveValue(data) }] }];
}

// ---------------------------------------------------------------------------
// composite: a single object, either flat fields or named nested records
// (e.g. F11's { closest: {...,margin}, widest: {...,margin} }).
// ---------------------------------------------------------------------------

function adaptComposite(data: unknown, valuePaths: string[]): Series {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
  const obj = data as Record<string, unknown>;
  const paths = valuePaths.length ? valuePaths : Object.keys(obj);
  const points: Point[] = [];
  for (const path of paths) {
    if (path in obj) {
      points.push({ label: path, value: resolveValue(obj[path]) });
      continue;
    }
    for (const [key, val] of Object.entries(obj)) {
      if (
        val &&
        typeof val === 'object' &&
        !Array.isArray(val) &&
        path in (val as Record<string, unknown>)
      ) {
        points.push({
          label: `${key} ${path}`,
          value: resolveValue((val as Record<string, unknown>)[path])
        });
      }
    }
  }
  return [{ points }];
}

// ---------------------------------------------------------------------------
// histogram: the classic {bins,counts,below,above} shape (F8/F9), or the
// bucket-row array shape (L5/L6).
// ---------------------------------------------------------------------------

function adaptHistogram(data: unknown, valuePaths: string[]): Series {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.bins) && Array.isArray(obj.counts)) {
      const bins = obj.bins as unknown[];
      const counts = obj.counts as unknown[];
      const points: Point[] = [];
      points.push({ label: 'below', value: resolveValue(obj.below) });
      const n = Math.min(counts.length, Math.max(bins.length - 1, 0));
      for (let i = 0; i < n; i++) {
        const lo = bins[i];
        const hi = bins[i + 1];
        const label =
          typeof lo === 'number' && typeof hi === 'number'
            ? `${lo}-${hi}`
            : `Bin ${i + 1}`;
        points.push({ label, value: resolveValue(counts[i]) });
      }
      points.push({ label: 'above', value: resolveValue(obj.above) });
      return [{ points }];
    }
  }
  if (Array.isArray(data)) {
    const fields = valuePaths.length ? valuePaths : ['winRate'];
    return fields.map((field) => ({
      name: fields.length > 1 ? field : undefined,
      points: data.map((row, i) => {
        const bucket =
          row && typeof row === 'object'
            ? (row as Record<string, unknown>).bucket
            : undefined;
        const label =
          typeof bucket === 'number' ? `Bucket ${bucket}` : `Bucket ${i + 1}`;
        return {
          label,
          value: resolveValue(extractRaw(row, field)),
          meta: buildMeta(row)
        };
      })
    }));
  }
  return [];
}

// ---------------------------------------------------------------------------
// ranking: populates rows/columns instead of series (H12, J4, L11).
// ---------------------------------------------------------------------------

function flattenRankingRow(row: unknown): Record<string, Json> {
  const out: Record<string, Json> = {};
  if (!row || typeof row !== 'object') return out;
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    if (
      v === null ||
      typeof v === 'number' ||
      typeof v === 'string' ||
      typeof v === 'boolean'
    ) {
      out[k] = v;
    }
  }
  return out;
}

function adaptRanking(
  data: unknown,
  ctx: AdaptContext,
  showTeamNames: boolean | undefined
): { rows: Record<string, Json>[]; columns: NonNullable<VizFrame['columns']> } {
  let rows: Record<string, Json>[] = [];

  if (Array.isArray(data)) {
    const first = data[0];
    if (
      first &&
      typeof first === 'object' &&
      Array.isArray((first as Record<string, unknown>).teams)
    ) {
      // L11-shaped: groups of { boundary, teams: [{teamKey,rank,rankingScore}] }
      rows = (data as Record<string, unknown>[]).flatMap((group) => {
        const boundary =
          typeof group.boundary === 'number' ? group.boundary : null;
        const teams = Array.isArray(group.teams)
          ? (group.teams as unknown[])
          : [];
        return teams.map((t) => {
          const team = (t && typeof t === 'object' ? t : {}) as Record<
            string,
            unknown
          >;
          const teamKey =
            typeof team.teamKey === 'number' ? team.teamKey : null;
          return {
            boundary,
            teamKey,
            team:
              typeof teamKey === 'number'
                ? labelForTeam(teamKey, ctx, showTeamNames)
                : 'Unknown',
            rank: typeof team.rank === 'number' ? team.rank : null,
            rankingScore:
              typeof team.rankingScore === 'number' ? team.rankingScore : null
          } satisfies Record<string, Json>;
        });
      });
    } else {
      rows = data.map((row) => {
        const flat = flattenRankingRow(row);
        const teamKey =
          row && typeof row === 'object'
            ? (row as Record<string, unknown>).teamKey
            : undefined;
        if (typeof teamKey === 'number')
          flat.team = labelForTeam(teamKey, ctx, showTeamNames);
        return flat;
      });
    }
  } else if (data && typeof data === 'object') {
    const flat = flattenRankingRow(data);
    const { teamKey } = data as Record<string, unknown>;
    if (typeof teamKey === 'number')
      flat.team = labelForTeam(teamKey, ctx, showTeamNames);
    rows = [flat];
  }

  const columns: NonNullable<VizFrame['columns']> = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push({
          key,
          label: key,
          align: typeof row[key] === 'number' ? 'right' : 'left'
        });
      }
    }
  }
  return { rows, columns };
}

function sortAndLimitRows(
  rows: Record<string, Json>[],
  sortDir: 'asc' | 'desc' | undefined,
  limit: number | undefined,
  sortKey: string | undefined
): Record<string, Json>[] {
  let out = rows;
  const key = sortKey ?? (rows[0] && 'rank' in rows[0] ? 'rank' : undefined);
  if (sortDir && key) {
    out = [...rows].sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const an = typeof av === 'number' ? av : null;
      const bn = typeof bv === 'number' ? bv : null;
      if (an === null && bn === null) return 0;
      if (an === null) return 1;
      if (bn === null) return -1;
      return sortDir === 'asc' ? an - bn : bn - an;
    });
  }
  if (typeof limit === 'number' && limit >= 0) out = out.slice(0, limit);
  return out;
}

// ---------------------------------------------------------------------------
// matrix: flattens {metrics, matrix} into rows/columns (L13).
// ---------------------------------------------------------------------------

function adaptMatrix(data: unknown): {
  rows: Record<string, Json>[];
  columns: NonNullable<VizFrame['columns']>;
} {
  if (!data || typeof data !== 'object' || Array.isArray(data))
    return { rows: [], columns: [] };
  const obj = data as Record<string, unknown>;
  const metrics = Array.isArray(obj.metrics) ? (obj.metrics as unknown[]) : [];
  const matrix = Array.isArray(obj.matrix) ? (obj.matrix as unknown[][]) : [];

  const columns: NonNullable<VizFrame['columns']> = [
    { key: 'metric', label: 'Metric', align: 'left' }
  ];
  for (const m of metrics) {
    if (typeof m === 'string')
      columns.push({ key: m, label: m, align: 'right' });
  }

  const rows: Record<string, Json>[] = metrics.map((rowMetric, i) => {
    const row: Record<string, Json> = {
      metric: typeof rowMetric === 'string' ? rowMetric : `Row ${i + 1}`
    };
    const matrixRow = Array.isArray(matrix[i]) ? matrix[i] : [];
    metrics.forEach((colMetric, j) => {
      const key = typeof colMetric === 'string' ? colMetric : `col${j}`;
      const cell = matrixRow[j];
      row[key] =
        typeof cell === 'number' && Number.isFinite(cell) ? cell : null;
    });
    return row;
  });

  return { rows, columns };
}

// ---------------------------------------------------------------------------
// timeSeries: the time key lives one level down inside each row's `value`
// (or, for flat ids like F13, on the row itself).
// ---------------------------------------------------------------------------

const TIME_FIELD_PRIORITY = ['second', 'seconds', 'fromSeconds', 'atUtc'];

function getTimeSeriesEntries(row: unknown): unknown[] {
  if (row && typeof row === 'object') {
    const { value } = row as Record<string, unknown>;
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      for (const v of Object.values(value as Record<string, unknown>)) {
        if (Array.isArray(v)) return v;
      }
    }
  }
  return [row];
}

function detectTimeField(entry: unknown): string | undefined {
  if (!entry || typeof entry !== 'object') return undefined;
  const r = entry as Record<string, unknown>;
  for (const key of TIME_FIELD_PRIORITY) {
    if (key in r) return key;
  }
  return undefined;
}

function formatTimeLabel(raw: unknown, index: number): string {
  if (typeof raw === 'number' && Number.isFinite(raw)) return `${raw}s`;
  if (typeof raw === 'string') return raw;
  return `t${index}`;
}

function adaptTimeSeries(
  data: unknown,
  valuePaths: string[],
  labelFn: (row: unknown, i: number) => string
): { series: Series; axis: VizFrame['axis'] } {
  const rows = Array.isArray(data) ? data : [];
  const multiRow = rows.length > 1;
  const seriesMap = new Map<string, Point[]>();
  let timeFieldSeen: string | undefined;

  rows.forEach((row, ri) => {
    const entries = getTimeSeriesEntries(row);
    const firstEntry = entries[0];
    const timeField = detectTimeField(firstEntry);
    if (timeField) timeFieldSeen = timeField;

    const entryKeys =
      firstEntry && typeof firstEntry === 'object'
        ? Object.keys(firstEntry as Record<string, unknown>)
        : [];
    const candidates = (valuePaths.length ? valuePaths : entryKeys).filter(
      (f) => f !== timeField
    );
    const fields = candidates.length ? candidates : ['value'];

    entries.forEach((entry, ei) => {
      const timeRaw = timeField
        ? (entry as Record<string, unknown> | undefined)?.[timeField]
        : undefined;
      const timeLabel = formatTimeLabel(timeRaw, ei);
      const label = multiRow ? `${labelFn(row, ri)} @ ${timeLabel}` : timeLabel;
      for (const field of fields) {
        let raw = extractRaw(entry, field);
        if (raw === undefined) raw = extractRaw(row, field);
        const points = seriesMap.get(field) ?? [];
        points.push({ label, value: resolveValue(raw), meta: buildMeta(row) });
        seriesMap.set(field, points);
      }
    });
  });

  const multiSeries = seriesMap.size > 1;
  const series: Series = Array.from(seriesMap.entries()).map(
    ([name, points]) => ({
      name: multiSeries ? name : undefined,
      points
    })
  );

  const xType: 'category' | 'value' | 'time' =
    timeFieldSeen === 'atUtc' ? 'time' : timeFieldSeen ? 'value' : 'category';

  return { series, axis: { xType, xLabel: timeFieldSeen } };
}

// ---------------------------------------------------------------------------
// geo: rows carrying country/countryCode/continent (J1, J6, J15).
// ---------------------------------------------------------------------------

function pickGeoLabel(
  rec: unknown,
  ctx: AdaptContext,
  showTeamNames: boolean | undefined,
  i: number
): string {
  if (rec && typeof rec === 'object') {
    const r = rec as Record<string, unknown>;
    if (typeof r.teamKey === 'number')
      return labelForTeam(r.teamKey, ctx, showTeamNames);
    if (typeof r.country === 'string') return r.country;
    if (typeof r.continent === 'string') return r.continent;
  }
  return `Row ${i + 1}`;
}

function adaptGeo(
  data: unknown,
  valuePaths: string[],
  ctx: AdaptContext,
  showTeamNames: boolean | undefined
): Series {
  const field = valuePaths[0];

  if (Array.isArray(data)) {
    return [
      {
        points: data.map((row, i) => ({
          label: pickGeoLabel(row, ctx, showTeamNames, i),
          value: field ? resolveValue(extractRaw(row, field)) : null,
          meta: buildMeta(row)
        }))
      }
    ];
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    const series: Series = [];
    for (const [key, val] of Object.entries(obj)) {
      if (Array.isArray(val)) {
        series.push({
          name: key,
          points: val.map((row, i) => ({
            label: pickGeoLabel(row, ctx, showTeamNames, i),
            value: field ? resolveValue(extractRaw(row, field)) : null,
            meta: buildMeta(row)
          }))
        });
      } else if (val && typeof val === 'object') {
        const nested = val as Record<string, unknown>;
        const fields = valuePaths.length ? valuePaths : Object.keys(nested);
        for (const f of fields) {
          let s = series.find((se) => se.name === f);
          if (!s) {
            s = { name: f, points: [] };
            series.push(s);
          }
          s.points.push({
            label: key,
            value: resolveValue(nested[f]),
            meta: buildMeta(nested)
          });
        }
      }
    }
    return series;
  }

  return [];
}

// ---------------------------------------------------------------------------
// adaptResult
// ---------------------------------------------------------------------------

export function adaptResult(
  result: StatResult,
  spec: GraphicSpec,
  ctx: AdaptContext
): VizFrame {
  const base = {
    kind: spec.kind,
    title: spec.title,
    ...(spec.subtitle !== undefined ? { subtitle: spec.subtitle } : {}),
    asOfUtc: ctx.asOfUtc
  };

  // A failed stat must degrade to an empty graphic, never crash the display.
  if (result.status !== 'ok') {
    return {
      ...base,
      quality: 'degraded',
      warnings: [...result.warnings],
      series: [],
      notes: [result.reason]
    };
  }

  const notes: string[] = [];

  try {
    const family: VizFamily = familyFor(ctx.catalogueId);
    const presentation = presentationFor(ctx.catalogueId);
    const { showTeamNames } = spec.options;
    const effectiveValuePaths = spec.options.valuePath
      ? [spec.options.valuePath]
      : presentation.valuePaths;

    let series: Series = [];
    let axis: VizFrame['axis'] | undefined;
    let columns: VizFrame['columns'] | undefined;
    let rows: Record<string, Json>[] | undefined;

    switch (family) {
      case 'scalar':
        series = adaptScalar(result.data, presentation.valueLabel);
        break;

      case 'teamRows':
      case 'teamRowsRecord':
        series = buildKeyedSeries(
          result.data,
          effectiveValuePaths,
          (row, i) => labelForTeamRow(row, ctx, showTeamNames, i),
          notes
        );
        break;

      case 'oprTable': {
        const dataObj =
          result.data &&
          typeof result.data === 'object' &&
          !Array.isArray(result.data)
            ? (result.data as Record<string, unknown>)
            : undefined;
        series = buildKeyedSeries(
          dataObj?.teams,
          effectiveValuePaths,
          (row, i) => labelForTeamRow(row, ctx, showTeamNames, i),
          notes
        );
        if (
          dataObj &&
          typeof dataObj.rank === 'number' &&
          typeof dataObj.columns === 'number'
        ) {
          notes.push(
            `Identifiable rank ${dataObj.rank} of ${dataObj.columns} columns`
          );
        }
        break;
      }

      case 'matchRows':
        series = buildKeyedSeries(
          result.data,
          effectiveValuePaths,
          (row, i) => labelForMatchRow(row, ctx, i),
          notes
        );
        break;

      case 'allianceRows':
        series = buildKeyedSeries(
          result.data,
          effectiveValuePaths,
          (row, i) => labelForAllianceRow(row, ctx, showTeamNames, i),
          notes
        );
        break;

      case 'categorical':
        series = buildKeyedSeries(
          result.data,
          effectiveValuePaths,
          (row, i) => labelForCategoricalRow(row, i),
          notes
        );
        break;

      case 'histogram':
        series = adaptHistogram(result.data, effectiveValuePaths);
        break;

      case 'composite':
        series = adaptComposite(result.data, effectiveValuePaths);
        break;

      case 'geo':
        series = adaptGeo(result.data, effectiveValuePaths, ctx, showTeamNames);
        break;

      case 'ranking': {
        const ranked = adaptRanking(result.data, ctx, showTeamNames);
        rows = sortAndLimitRows(
          ranked.rows,
          spec.options.sortDir,
          spec.options.limit,
          spec.options.valuePath
        );
        columns = ranked.columns;
        break;
      }

      case 'matrix': {
        const m = adaptMatrix(result.data);
        rows = m.rows;
        columns = m.columns;
        break;
      }

      case 'timeSeries': {
        const ts = adaptTimeSeries(result.data, effectiveValuePaths, (row, i) =>
          labelForMatchRow(row, ctx, i)
        );
        series = ts.series;
        axis = ts.axis;
        break;
      }
    }

    series = series.map((s) => ({
      ...s,
      points: applySortAndLimit(
        s.points,
        spec.options.sortDir,
        spec.options.limit
      )
    }));

    return {
      ...base,
      quality: result.quality,
      warnings: [...result.warnings],
      series,
      ...(axis ? { axis } : {}),
      ...(columns ? { columns } : {}),
      ...(rows ? { rows } : {}),
      ...(notes.length ? { notes } : {})
    };
  } catch (err) {
    // Never let a family-specific edge case crash the display: degrade to
    // an empty-but-valid frame instead, same as a failed StatResult would.
    notes.push(
      `Adapter error: ${err instanceof Error ? err.message : String(err)}`
    );
    return {
      ...base,
      quality: 'degraded',
      warnings: [...result.warnings],
      series: [],
      notes
    };
  }
}
