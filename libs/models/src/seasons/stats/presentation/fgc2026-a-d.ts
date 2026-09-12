/**
 * FGC2026 semantic presentation registrations for every catalogue id
 * beginning A, B, C, or D (95 ids total: A1-A42, B1-B22, C1-C22, D1-D9).
 *
 * Each `SemanticRegistration` translates the exact result shape documented
 * in `../result-schemas.ts` (verified against real computed output in
 * `../tests/golden.json`) into a typed `PresentationData` payload using the
 * task-4 helpers in `./semantic-helpers.ts`. This module owns its own
 * rendering logic end to end; it does not touch the shared registry,
 * `adapters.ts`, `presentation.ts`, `families.ts`, or any barrel.
 *
 * Design notes shared across every registration below:
 *
 *   - `higherIsBetter` is set only where a direction is genuinely
 *     meaningful for the *default* measure. It is deliberately omitted
 *     (left undirected) for descriptive/contextual stats (schedule
 *     strength, luck rating, signed divergences, raw counts with no
 *     inherent "better") rather than defaulted to `true`.
 *   - `requiredParams` mirrors the authoritative per-id parameter
 *     requirements in `../parameter-schemas.ts` (e.g. `alliance` for every
 *     stat whose formula reads `p.alliance`), not a guess from the
 *     catalogue prose.
 *   - Real measured zeros, `null` "no observation" markers, negative
 *     numbers, and booleans are passed straight through via the
 *     `numericCell` / `tableCell` / `textCell` helpers - never coerced
 *     with `?? 0` / `|| 0`.
 *   - A match's identity is always built with `matchEntity(tournamentKey,
 *     matchId, ctx)`, never a bare match id, so it stays tournament-qualified.
 */
import {
  type SemanticRegistration,
  type SemanticMeasure,
  type SemanticEntity,
  type SemanticCell,
  type SemanticTableRow,
  createSemanticFrame,
  requireOkResult,
  tableCell,
  numericCell,
  textCell,
  arrayElementId,
  teamEntity,
  matchEntity,
  numberFormat,
  percentFormat,
  scalarData,
  categoricalData,
  lineData,
  tableData,
  flattenTableRows,
  SemanticPreparationError
} from './semantic-helpers.js';
import {
  SUPPORTED_GRAPHIC_MODES,
  type GraphicKind,
  type GraphicSpec,
  type MeasureFormat,
  type PresentationFrame,
  type PresentationMode
} from '../../../base/Graphics.js';
import type { StatResult } from '../types.js';
import type { AdaptContext } from './adapters.js';

const SEASON = 'fgc_2026';
type OkResult = Extract<StatResult, { status: 'ok' }>;

function modesFor(
  kinds: readonly GraphicKind[]
): Partial<Record<GraphicKind, readonly PresentationMode[]>> {
  return Object.fromEntries(
    kinds.map((kind) => [kind, SUPPORTED_GRAPHIC_MODES[kind]])
  );
}

// ---------------------------------------------------------------------------
// Shared rendering core: an "entity + typed cells" row renders as a bar /
// grouped-bar (chart) or a table (lossless fallback), selected by spec.kind.
// ---------------------------------------------------------------------------

interface EntityCells {
  entity: SemanticEntity;
  cells: Record<string, SemanticCell>;
}

function cellsFrame(
  spec: GraphicSpec,
  ctx: AdaptContext,
  result: OkResult,
  rows: EntityCells[],
  measures: SemanticMeasure[],
  options: { emptyReason?: string; notes?: string[]; warnings?: string[] } = {}
): PresentationFrame {
  if (spec.kind === 'table' || spec.kind === 'ranking-table') {
    const tableRows = rows.map((row) => ({
      id: row.entity.id,
      label: row.entity.label,
      cells: row.cells
    }));
    return createSemanticFrame(
      spec,
      ctx,
      result,
      tableData(spec.kind, measures, tableRows),
      options
    );
  }
  if (spec.kind === 'bar' || spec.kind === 'grouped-bar') {
    const entities = rows.map((row) => row.entity);
    const series = measures.map((measure) => ({
      id: measure.id,
      label: measure.label,
      measure,
      points: rows.map((row) => {
        const cell = row.cells[measure.id];
        if (cell !== null && typeof cell !== 'number') {
          throw new SemanticPreparationError(
            `${ctx.catalogueId}/${measure.id}: a non-numeric cell cannot be charted; request kind "table" for this stat`
          );
        }
        return { entityId: row.entity.id, value: cell };
      })
    }));
    const sort =
      spec.options.sortDir && measures.length === 1
        ? { seriesId: measures[0].id, direction: spec.options.sortDir }
        : undefined;
    return createSemanticFrame(
      spec,
      ctx,
      result,
      categoricalData(spec.kind, entities, series, {
        sort,
        limit: spec.options.limit
      }),
      options
    );
  }
  throw new SemanticPreparationError(
    `${ctx.catalogueId}: unsupported graphic kind "${spec.kind}" for this stat`
  );
}

// ---------------------------------------------------------------------------
// Factory 1: single numeric measure per team or per match ("teamRows(n)" /
// "matchRows(n)" shapes - the majority of the catalogue).
// ---------------------------------------------------------------------------

interface SimpleConfig {
  id: string;
  label: string;
  format: MeasureFormat;
  higherIsBetter?: boolean;
  requiredParams?: string[];
  assertions: string[];
}

function simpleValueRegistration(
  entityKind: 'team' | 'match',
  cfg: SimpleConfig
): SemanticRegistration {
  const measure: SemanticMeasure = {
    id: 'value',
    label: cfg.label,
    format: cfg.format
  };
  return {
    seasonKey: SEASON,
    catalogueId: cfg.id,
    metadata: {
      defaultKind: 'bar',
      supportedKinds: ['bar', 'table'],
      modesByKind: modesFor(['bar', 'table']),
      measures: [measure],
      defaultMeasureId: 'value',
      ...(cfg.higherIsBetter !== undefined
        ? { higherIsBetter: cfg.higherIsBetter }
        : {}),
      ...(cfg.requiredParams ? { requiredParams: cfg.requiredParams } : {})
    },
    manifest: {
      catalogueId: cfg.id,
      fixtureExpectation: 'nonempty',
      assertions: cfg.assertions
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const { showTeamNames } = spec.options;
      const raw = ok.data as unknown as (
        | { teamKey: number; value: number | null }
        | { tournamentKey: string; matchId: number; value: number | null }
      )[];
      const rows: EntityCells[] = raw.map((row) => ({
        entity:
          entityKind === 'team'
            ? teamEntity(
                (row as { teamKey: number }).teamKey,
                ctx,
                showTeamNames
              )
            : matchEntity(
                (row as { tournamentKey: string }).tournamentKey,
                (row as { matchId: number }).matchId,
                ctx
              ),
        cells: { value: numericCell(row.value, `${cfg.id}/value`) }
      }));
      return cellsFrame(spec, ctx, ok, rows, [measure]);
    }
  };
}

// ---------------------------------------------------------------------------
// Factory 2: single scalar event-wide value (stat-tile).
// ---------------------------------------------------------------------------

interface ScalarConfig {
  id: string;
  label: string;
  format: MeasureFormat;
  higherIsBetter?: boolean;
  assertions: string[];
}

function scalarRegistration(cfg: ScalarConfig): SemanticRegistration {
  const measure: SemanticMeasure = {
    id: 'value',
    label: cfg.label,
    format: cfg.format
  };
  return {
    seasonKey: SEASON,
    catalogueId: cfg.id,
    metadata: {
      defaultKind: 'stat-tile',
      supportedKinds: ['stat-tile'],
      modesByKind: modesFor(['stat-tile']),
      measures: [measure],
      defaultMeasureId: 'value',
      ...(cfg.higherIsBetter !== undefined
        ? { higherIsBetter: cfg.higherIsBetter }
        : {})
    },
    manifest: {
      catalogueId: cfg.id,
      fixtureExpectation: 'nonempty',
      assertions: cfg.assertions
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      return createSemanticFrame(
        spec,
        ctx,
        ok,
        scalarData([{ measure, value: ok.data }])
      );
    }
  };
}

// ---------------------------------------------------------------------------
// Factory 3: a boolean flag per match. Rendered as a table so the real
// `true`/`false` type is preserved rather than coerced to 0/1.
// ---------------------------------------------------------------------------

interface BooleanConfig {
  id: string;
  label: string;
  higherIsBetter?: boolean;
  requiredParams?: string[];
  assertions: string[];
  fixtureExpectation?: 'nonempty' | 'legitimately-empty' | 'source-failure';
  emptyReason?: string;
}

function booleanMatchRegistration(cfg: BooleanConfig): SemanticRegistration {
  const measure: SemanticMeasure = {
    id: 'value',
    label: cfg.label,
    format: { style: 'text', scale: 1 }
  };
  return {
    seasonKey: SEASON,
    catalogueId: cfg.id,
    metadata: {
      defaultKind: 'table',
      supportedKinds: ['table'],
      modesByKind: modesFor(['table']),
      measures: [measure],
      defaultMeasureId: 'value',
      ...(cfg.higherIsBetter !== undefined
        ? { higherIsBetter: cfg.higherIsBetter }
        : {}),
      ...(cfg.requiredParams ? { requiredParams: cfg.requiredParams } : {})
    },
    manifest: {
      catalogueId: cfg.id,
      fixtureExpectation: cfg.fixtureExpectation ?? 'nonempty',
      assertions: cfg.assertions,
      ...(cfg.emptyReason ? { emptyReason: cfg.emptyReason } : {})
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const raw = ok.data as unknown as {
        tournamentKey: string;
        matchId: number;
        value: boolean | null;
      }[];
      const rows: EntityCells[] = raw.map((row) => ({
        entity: matchEntity(row.tournamentKey, row.matchId, ctx),
        cells: { value: tableCell(row.value, `${cfg.id}/value`) }
      }));
      return cellsFrame(spec, ctx, ok, rows, [measure]);
    }
  };
}

// ---------------------------------------------------------------------------
// Factory 4: a small named record per team or per match ("teamRowsRecord" /
// record-shaped "matchRows" ids). `extract` digs the raw field map out of
// whatever shape the row actually has (nested under `value`, or flat).
// ---------------------------------------------------------------------------

interface RecordConfig {
  id: string;
  entityKind: 'team' | 'match';
  measures: SemanticMeasure[];
  defaultMeasureId: string;
  higherIsBetter?: boolean;
  requiredParams?: string[];
  assertions: string[];
  extract(row: Record<string, unknown>): Record<string, unknown> | null;
  supportedKinds?: readonly GraphicKind[];
  defaultKind?: GraphicKind;
}

function recordRegistration(cfg: RecordConfig): SemanticRegistration {
  const supportedKinds =
    cfg.supportedKinds ?? (['grouped-bar', 'table'] as const);
  const defaultKind = cfg.defaultKind ?? 'grouped-bar';
  return {
    seasonKey: SEASON,
    catalogueId: cfg.id,
    metadata: {
      defaultKind,
      supportedKinds,
      modesByKind: modesFor(supportedKinds),
      measures: cfg.measures,
      defaultMeasureId: cfg.defaultMeasureId,
      ...(cfg.higherIsBetter !== undefined
        ? { higherIsBetter: cfg.higherIsBetter }
        : {}),
      ...(cfg.requiredParams ? { requiredParams: cfg.requiredParams } : {})
    },
    manifest: {
      catalogueId: cfg.id,
      fixtureExpectation: 'nonempty',
      assertions: cfg.assertions
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const { showTeamNames } = spec.options;
      const raw = ok.data as unknown as Record<string, unknown>[];
      const rows: EntityCells[] = raw.map((row) => {
        const entity =
          cfg.entityKind === 'team'
            ? teamEntity(row.teamKey as number, ctx, showTeamNames)
            : matchEntity(
                row.tournamentKey as string,
                row.matchId as number,
                ctx
              );
        const record = cfg.extract(row);
        const cells: Record<string, SemanticCell> = {};
        for (const measure of cfg.measures) {
          cells[measure.id] =
            record === null
              ? null
              : numericCell(record[measure.id], `${cfg.id}/${measure.id}`);
        }
        return { entity, cells };
      });
      return cellsFrame(spec, ctx, ok, rows, cfg.measures);
    }
  };
}

// ---------------------------------------------------------------------------
// A1-A9: OPR-family least-squares team ratings.
// ---------------------------------------------------------------------------

interface OprConfig {
  id: string;
  label: string;
  higherIsBetter?: boolean;
  requiredParams?: string[];
  assertions: string[];
}

function oprRegistration(cfg: OprConfig): SemanticRegistration {
  const measure: SemanticMeasure = {
    id: 'value',
    label: cfg.label,
    format: numberFormat(1, 'pts')
  };
  return {
    seasonKey: SEASON,
    catalogueId: cfg.id,
    metadata: {
      defaultKind: 'bar',
      supportedKinds: ['bar', 'table'],
      modesByKind: modesFor(['bar', 'table']),
      measures: [measure],
      defaultMeasureId: 'value',
      ...(cfg.higherIsBetter !== undefined
        ? { higherIsBetter: cfg.higherIsBetter }
        : {}),
      ...(cfg.requiredParams ? { requiredParams: cfg.requiredParams } : {})
    },
    manifest: {
      catalogueId: cfg.id,
      fixtureExpectation: 'nonempty',
      assertions: cfg.assertions
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const { showTeamNames } = spec.options;
      const data = ok.data as unknown as {
        teams: { teamKey: number; value: number | null }[];
        rank: number;
        columns: number;
      };
      const rows: EntityCells[] = data.teams.map((team) => ({
        entity: teamEntity(team.teamKey, ctx, showTeamNames),
        cells: { value: numericCell(team.value, `${cfg.id}/value`) }
      }));
      return cellsFrame(spec, ctx, ok, rows, [measure], {
        notes: [`Solved matrix rank ${data.rank} of ${data.columns} columns`]
      });
    }
  };
}

// ---------------------------------------------------------------------------
// A16 / A18 / A42: per-match predictions unioned with a per-row failure
// variant (insufficient prior data for that match). A failed row becomes a
// real `null` observation on the chart, with its reason recorded in notes -
// never silently dropped, never a fabricated value.
// ---------------------------------------------------------------------------

interface PredictionConfig {
  id: string;
  label: string;
  format: MeasureFormat;
  higherIsBetter?: boolean;
  requiredParams?: string[];
  assertions: string[];
}

function predictionRegistration(cfg: PredictionConfig): SemanticRegistration {
  const measure: SemanticMeasure = {
    id: 'value',
    label: cfg.label,
    format: cfg.format
  };
  return {
    seasonKey: SEASON,
    catalogueId: cfg.id,
    metadata: {
      defaultKind: 'bar',
      supportedKinds: ['bar', 'table'],
      modesByKind: modesFor(['bar', 'table']),
      measures: [measure],
      defaultMeasureId: 'value',
      ...(cfg.higherIsBetter !== undefined
        ? { higherIsBetter: cfg.higherIsBetter }
        : {}),
      ...(cfg.requiredParams ? { requiredParams: cfg.requiredParams } : {})
    },
    manifest: {
      catalogueId: cfg.id,
      fixtureExpectation: 'nonempty',
      assertions: cfg.assertions
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const raw = ok.data as unknown as (
        | { tournamentKey: string; matchId: number; value: number }
        | {
            tournamentKey: string;
            matchId: number;
            status: string;
            reason: string;
          }
      )[];
      const notes: string[] = [];
      const rows: EntityCells[] = raw.map((row) => {
        const entity = matchEntity(row.tournamentKey, row.matchId, ctx);
        if ('status' in row) {
          notes.push(`${entity.label}: ${row.reason}`);
          return { entity, cells: { value: null } };
        }
        return {
          entity,
          cells: { value: numericCell(row.value, `${cfg.id}/value`) }
        };
      });
      return cellsFrame(spec, ctx, ok, rows, [measure], { notes });
    }
  };
}

// ---------------------------------------------------------------------------
// A19: Monte-Carlo predicted score distribution. KNOWN DEFECT FIX - the
// legacy adapter's generic `resolveValue` collapses this whole
// `{red,blue,samples,seed}` object to `null` because it only recognises a
// `{score:number}` shape. Here every quantile is surfaced as its own typed,
// named column instead of being discarded.
// ---------------------------------------------------------------------------

function a19Registration(): SemanticRegistration {
  const measures: SemanticMeasure[] = [
    { id: 'redP10', label: 'Red p10', format: numberFormat(1, 'pts') },
    { id: 'redP50', label: 'Red p50 (median)', format: numberFormat(1, 'pts') },
    { id: 'redP90', label: 'Red p90', format: numberFormat(1, 'pts') },
    { id: 'blueP10', label: 'Blue p10', format: numberFormat(1, 'pts') },
    {
      id: 'blueP50',
      label: 'Blue p50 (median)',
      format: numberFormat(1, 'pts')
    },
    { id: 'blueP90', label: 'Blue p90', format: numberFormat(1, 'pts') },
    { id: 'samples', label: 'Monte Carlo samples', format: numberFormat(0) }
  ];
  return {
    seasonKey: SEASON,
    catalogueId: 'A19',
    metadata: {
      defaultKind: 'table',
      supportedKinds: ['table'],
      modesByKind: modesFor(['table']),
      measures,
      defaultMeasureId: 'redP50',
      requiredParams: ['samples', 'seed']
    },
    manifest: {
      catalogueId: 'A19',
      fixtureExpectation: 'nonempty',
      assertions: [
        'Preserves the full red/blue p10/p50/p90 quantile arrays per match as six named, typed columns rather than collapsing the prediction object to null',
        'A row whose prediction was infeasible (insufficient prior data) carries null quantile cells plus its documented reason in notes'
      ]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const raw = ok.data as unknown as (
        | {
            tournamentKey: string;
            matchId: number;
            value: {
              red: (number | null)[];
              blue: (number | null)[];
              samples: number;
              seed: number;
            };
          }
        | {
            tournamentKey: string;
            matchId: number;
            status: string;
            reason: string;
          }
      )[];
      const notes: string[] = [];
      const rows: SemanticTableRow[] = raw.map((row) => {
        const entity = matchEntity(row.tournamentKey, row.matchId, ctx);
        if ('status' in row) {
          notes.push(`${entity.label}: ${row.reason}`);
          return {
            id: entity.id,
            label: entity.label,
            cells: Object.fromEntries(measures.map((m) => [m.id, null]))
          };
        }
        const v = row.value;
        return {
          id: entity.id,
          label: entity.label,
          cells: {
            redP10: numericCell(v.red[0], 'A19/redP10'),
            redP50: numericCell(v.red[1], 'A19/redP50'),
            redP90: numericCell(v.red[2], 'A19/redP90'),
            blueP10: numericCell(v.blue[0], 'A19/blueP10'),
            blueP50: numericCell(v.blue[1], 'A19/blueP50'),
            blueP90: numericCell(v.blue[2], 'A19/blueP90'),
            samples: numericCell(v.samples, 'A19/samples')
          }
        };
      });
      return createSemanticFrame(
        spec,
        ctx,
        ok,
        tableData('table', measures, rows),
        { notes }
      );
    }
  };
}

// ---------------------------------------------------------------------------
// A21: upset index, keyed by a JSON-tuple `matchKey` string. Decoded into a
// real tournament-qualified match entity rather than treated as an opaque
// label.
// ---------------------------------------------------------------------------

function a21Registration(): SemanticRegistration {
  const measure: SemanticMeasure = {
    id: 'value',
    label: 'Upset index',
    format: percentFormat('ratio', 1)
  };
  return {
    seasonKey: SEASON,
    catalogueId: 'A21',
    metadata: {
      defaultKind: 'bar',
      supportedKinds: ['bar', 'table'],
      modesByKind: modesFor(['bar', 'table']),
      measures: [measure],
      defaultMeasureId: 'value'
    },
    manifest: {
      catalogueId: 'A21',
      fixtureExpectation: 'nonempty',
      assertions: [
        'Decodes the `["tournamentKey",matchId]` matchKey tuple into a real tournament-qualified match identity'
      ]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const raw = ok.data as unknown as { matchKey: string; value: number }[];
      const rows: EntityCells[] = raw.map((row) => {
        const [tournamentKey, matchId] = JSON.parse(row.matchKey) as [
          string,
          number
        ];
        return {
          entity: matchEntity(tournamentKey, matchId, ctx),
          cells: { value: numericCell(row.value, 'A21/value') }
        };
      });
      return cellsFrame(spec, ctx, ok, rows, [measure]);
    }
  };
}

// ---------------------------------------------------------------------------
// B13 / B14: KNOWN DEFECT FIX - both keep elapsed seconds as a real numeric,
// chronologically-ordered x-coordinate. A formatted string (e.g. "50 balls"
// or "1.4s") only ever appears in a separate `label` field, never baked
// into the coordinate itself.
// ---------------------------------------------------------------------------

function b13Registration(): SemanticRegistration {
  const lineMeasure: SemanticMeasure = {
    id: 'value',
    label: 'Balls contained at milestone',
    format: numberFormat(0)
  };
  const tableMeasure: SemanticMeasure = {
    id: 'value',
    label: 'Seconds elapsed',
    format: numberFormat(1, 's')
  };
  return {
    seasonKey: SEASON,
    catalogueId: 'B13',
    metadata: {
      defaultKind: 'line',
      supportedKinds: ['line', 'table'],
      modesByKind: modesFor(['line', 'table']),
      measures: [lineMeasure],
      defaultMeasureId: 'value',
      requiredParams: ['alliance']
    },
    manifest: {
      catalogueId: 'B13',
      fixtureExpectation: 'nonempty',
      assertions: [
        'Elapsed seconds is a real numeric, chronologically-ordered x-coordinate; the "N balls" milestone is a separate point label, never baked into the coordinate',
        'A milestone never reached in a match has no real x-coordinate and is therefore recorded in notes instead of a fabricated point'
      ]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const raw = ok.data as unknown as {
        tournamentKey: string;
        matchId: number;
        value: { milestone: number; seconds: number | null }[];
      }[];
      const notes: string[] = [];
      if (spec.kind === 'table') {
        const rows: SemanticTableRow[] = raw.flatMap((row) => {
          const entity = matchEntity(row.tournamentKey, row.matchId, ctx);
          return row.value.map((milestone, index) => ({
            id: arrayElementId(entity.id, 'milestones', index),
            label: `${entity.label} · ${milestone.milestone} balls`,
            cells: { value: numericCell(milestone.seconds, 'B13/seconds') }
          }));
        });
        return createSemanticFrame(
          spec,
          ctx,
          ok,
          tableData('table', [tableMeasure], rows),
          { notes }
        );
      }
      const series = raw
        .map((row) => {
          const entity = matchEntity(row.tournamentKey, row.matchId, ctx);
          const points = row.value
            .filter((milestone) => {
              if (milestone.seconds === null) {
                notes.push(
                  `${entity.label}: milestone of ${milestone.milestone} balls was not reached`
                );
                return false;
              }
              return true;
            })
            .map((milestone) => ({
              x: milestone.seconds as number,
              value: milestone.milestone,
              label: `${milestone.milestone} balls`
            }));
          return {
            id: entity.id,
            label: entity.label,
            measure: lineMeasure,
            points
          };
        })
        .filter((series) => series.points.length > 0);
      return createSemanticFrame(
        spec,
        ctx,
        ok,
        lineData('number', series, 'Seconds elapsed'),
        {
          notes,
          emptyReason:
            series.length === 0
              ? 'No milestone was reached in any selected match'
              : undefined
        }
      );
    }
  };
}

function b14Registration(): SemanticRegistration {
  const measure: SemanticMeasure = {
    id: 'value',
    label: 'Balls contained',
    format: numberFormat(0)
  };
  return {
    seasonKey: SEASON,
    catalogueId: 'B14',
    metadata: {
      defaultKind: 'line',
      supportedKinds: ['line'],
      modesByKind: modesFor(['line']),
      measures: [measure],
      defaultMeasureId: 'value',
      requiredParams: ['alliance']
    },
    manifest: {
      catalogueId: 'B14',
      fixtureExpectation: 'nonempty',
      assertions: [
        'Elapsed seconds stays a real numeric, chronologically-ordered x-coordinate for the scoring curve, distinct from any formatted label',
        'The computed front/back-loaded skew score is preserved as a per-match note alongside the curve rather than being dropped'
      ]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const raw = ok.data as unknown as {
        tournamentKey: string;
        matchId: number;
        value: {
          points: { seconds: number | null; count: unknown }[];
          skew: number | null;
        } | null;
      }[];
      const notes: string[] = [];
      const series = raw.flatMap((row) => {
        const entity = matchEntity(row.tournamentKey, row.matchId, ctx);
        if (!row.value) {
          notes.push(`${entity.label}: no suppression events were captured`);
          return [];
        }
        if (row.value.skew !== null) {
          const shape =
            row.value.skew < 0
              ? 'front-loaded'
              : row.value.skew > 0
                ? 'back-loaded'
                : 'even';
          notes.push(
            `${entity.label}: skew ${row.value.skew.toFixed(3)} (${shape})`
          );
        }
        const points = row.value.points
          .filter((point) => point.seconds !== null)
          .map((point) => ({
            x: point.seconds as number,
            value: numericCell(point.count, `B14/${entity.id}/count`)
          }));
        return points.length
          ? [{ id: entity.id, label: entity.label, measure, points }]
          : [];
      });
      return createSemanticFrame(
        spec,
        ctx,
        ok,
        lineData('number', series, 'Seconds elapsed'),
        {
          notes,
          emptyReason:
            series.length === 0
              ? 'No suppression events were captured for any selected match'
              : undefined
        }
      );
    }
  };
}

// ---------------------------------------------------------------------------
// B16: extinguisher entry attribution, grouped by the entering tablet's
// actor/client id per match (up to three tablets race on one counter).
// ---------------------------------------------------------------------------

function b16Registration(): SemanticRegistration {
  const measures: SemanticMeasure[] = [
    { id: 'entries', label: 'Entries', format: numberFormat(0) },
    { id: 'netEntered', label: 'Net balls entered', format: numberFormat(0) }
  ];
  return {
    seasonKey: SEASON,
    catalogueId: 'B16',
    metadata: {
      defaultKind: 'table',
      supportedKinds: ['table'],
      modesByKind: modesFor(['table']),
      measures,
      defaultMeasureId: 'netEntered'
    },
    manifest: {
      catalogueId: 'B16',
      fixtureExpectation: 'nonempty',
      assertions: [
        "Groups by the entering tablet's actor/client id (up to three tablets can race on this one counter), not by scorer identity"
      ]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const raw = ok.data as unknown as {
        tournamentKey: string;
        matchId: number;
        value: { actor: string; entries: number; netEntered: number }[];
      }[];
      const rows = flattenTableRows(raw, {
        parentId: (row) => matchEntity(row.tournamentKey, row.matchId, ctx).id,
        path: 'actors',
        children: (row) => row.value,
        row: (entry, parentRow) => ({
          label: `${matchEntity(parentRow.tournamentKey, parentRow.matchId, ctx).label} · ${entry.actor}`,
          cells: { entries: entry.entries, netEntered: entry.netEntered }
        })
      });
      return createSemanticFrame(
        spec,
        ctx,
        ok,
        tableData('table', measures, rows),
        {}
      );
    }
  };
}

// ---------------------------------------------------------------------------
// C1: brace state per station, per match. KNOWN DEFECT FIX (C-series) -
// every one of the six per-match station values is surfaced as its own
// identified row instead of the nested array disappearing.
// ---------------------------------------------------------------------------

function c1Registration(): SemanticRegistration {
  const measure: SemanticMeasure = {
    id: 'value',
    label: 'Brace state',
    format: numberFormat(2)
  };
  return {
    seasonKey: SEASON,
    catalogueId: 'C1',
    metadata: {
      defaultKind: 'table',
      supportedKinds: ['table'],
      modesByKind: modesFor(['table']),
      measures: [measure],
      defaultMeasureId: 'value'
    },
    manifest: {
      catalogueId: 'C1',
      fixtureExpectation: 'nonempty',
      assertions: [
        'Surfaces all six station brace values per match, including real zero (no climb) values, as separately identified rows rather than an aggregate'
      ]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const raw = ok.data as unknown as {
        tournamentKey: string;
        matchId: number;
        value: { station: string; brace: number }[];
      }[];
      const rows = flattenTableRows(raw, {
        parentId: (row) => matchEntity(row.tournamentKey, row.matchId, ctx).id,
        path: 'stations',
        children: (row) => row.value,
        row: (entry, parentRow) => ({
          label: `${matchEntity(parentRow.tournamentKey, parentRow.matchId, ctx).label} · ${entry.station}`,
          cells: { value: entry.brace }
        })
      });
      return createSemanticFrame(
        spec,
        ctx,
        ok,
        tableData('table', [measure], rows),
        {}
      );
    }
  };
}

// ---------------------------------------------------------------------------
// C11 / C13 / C16 / C20: a per-team list of per-match values. KNOWN DEFECT
// FIX (C-series) - every per-match entry is preserved as its own row keyed
// by team + tournament-qualified match, instead of the nested per-team
// array collapsing away.
// ---------------------------------------------------------------------------

interface TeamMatchListConfig {
  id: string;
  label: string;
  format: MeasureFormat;
  higherIsBetter?: boolean;
  assertions: string[];
}

function teamMatchListRegistration(
  cfg: TeamMatchListConfig
): SemanticRegistration {
  const measure: SemanticMeasure = {
    id: 'value',
    label: cfg.label,
    format: cfg.format
  };
  return {
    seasonKey: SEASON,
    catalogueId: cfg.id,
    metadata: {
      defaultKind: 'table',
      supportedKinds: ['table'],
      modesByKind: modesFor(['table']),
      measures: [measure],
      defaultMeasureId: 'value',
      ...(cfg.higherIsBetter !== undefined
        ? { higherIsBetter: cfg.higherIsBetter }
        : {})
    },
    manifest: {
      catalogueId: cfg.id,
      fixtureExpectation: 'nonempty',
      assertions: cfg.assertions
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const { showTeamNames } = spec.options;
      const raw = ok.data as unknown as {
        teamKey: number;
        value:
          | { tournamentKey: string; matchId: number; value: number | null }[]
          | null;
      }[];
      const rows = flattenTableRows(raw, {
        parentId: (row) => teamEntity(row.teamKey, ctx, showTeamNames).id,
        path: 'matches',
        children: (row) => row.value ?? [],
        row: (match, parentRow) => ({
          label: `${teamEntity(parentRow.teamKey, ctx, showTeamNames).label} · ${matchEntity(match.tournamentKey, match.matchId, ctx).label}`,
          cells: { value: numericCell(match.value, `${cfg.id}/value`) }
        })
      });
      return createSemanticFrame(
        spec,
        ctx,
        ok,
        tableData('table', [measure], rows),
        {
          emptyReason:
            rows.length === 0
              ? 'No team had an eligible climb/brace observation in this fixture'
              : undefined
        }
      );
    }
  };
}

// ---------------------------------------------------------------------------
// C12: single event-wide "most valuable climb" record.
// ---------------------------------------------------------------------------

function c12Registration(): SemanticRegistration {
  const measures: SemanticMeasure[] = [
    {
      id: 'value',
      label: 'Marginal climb value',
      format: numberFormat(1, 'pts')
    }
  ];
  return {
    seasonKey: SEASON,
    catalogueId: 'C12',
    metadata: {
      defaultKind: 'table',
      supportedKinds: ['table'],
      modesByKind: modesFor(['table']),
      measures,
      defaultMeasureId: 'value',
      higherIsBetter: true
    },
    manifest: {
      catalogueId: 'C12',
      fixtureExpectation: 'nonempty',
      assertions: [
        'A single event-wide record naming which team, in which tournament-qualified match, produced the single most valuable climb'
      ]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const { showTeamNames } = spec.options;
      const data = ok.data as unknown as {
        teamKey: number;
        tournamentKey: string;
        matchId: number;
        value: number;
      };
      const team = teamEntity(data.teamKey, ctx, showTeamNames);
      const match = matchEntity(data.tournamentKey, data.matchId, ctx);
      const row = {
        id: team.id,
        label: `${team.label} · ${match.label}`,
        cells: { value: numericCell(data.value, 'C12/value') }
      };
      return createSemanticFrame(
        spec,
        ctx,
        ok,
        tableData('table', measures, [row]),
        {}
      );
    }
  };
}

// ---------------------------------------------------------------------------
// C19: ordered zone-upgrade transitions, per team, per match. Triple-nested
// in the source; every transition becomes its own row.
// ---------------------------------------------------------------------------

function c19Registration(): SemanticRegistration {
  const measures: SemanticMeasure[] = [
    { id: 'from', label: 'From zone', format: numberFormat(2) },
    { id: 'to', label: 'To zone', format: numberFormat(2) },
    { id: 'atUtc', label: 'Logged at', format: { style: 'text', scale: 1 } }
  ];
  return {
    seasonKey: SEASON,
    catalogueId: 'C19',
    metadata: {
      defaultKind: 'table',
      supportedKinds: ['table'],
      modesByKind: modesFor(['table']),
      measures,
      defaultMeasureId: 'to'
    },
    manifest: {
      catalogueId: 'C19',
      fixtureExpectation: 'nonempty',
      assertions: [
        'Preserves every ordered from-zone / to-zone brace transition per team per match, not just the final state'
      ]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const { showTeamNames } = spec.options;
      const raw = ok.data as unknown as {
        teamKey: number;
        value: {
          tournamentKey: string;
          matchId: number;
          value: { atUtc: string; from: unknown; to: unknown }[];
        }[];
      }[];
      const rows: SemanticTableRow[] = [];
      for (const teamRow of raw) {
        const team = teamEntity(teamRow.teamKey, ctx, showTeamNames);
        for (const matchRow of teamRow.value) {
          const match = matchEntity(
            matchRow.tournamentKey,
            matchRow.matchId,
            ctx
          );
          matchRow.value.forEach((transition, index) => {
            rows.push({
              id: arrayElementId(
                match.id,
                `team-${teamRow.teamKey}-transitions`,
                index
              ),
              label: `${team.label} · ${match.label} · #${index + 1}`,
              cells: {
                from: tableCell(transition.from, 'C19/from'),
                to: tableCell(transition.to, 'C19/to'),
                atUtc: textCell(transition.atUtc, 'C19/atUtc')
              }
            });
          });
        }
      }
      return createSemanticFrame(
        spec,
        ctx,
        ok,
        tableData('table', measures, rows),
        {
          emptyReason:
            rows.length === 0
              ? 'No brace transitions were logged for any team in this fixture'
              : undefined
        }
      );
    }
  };
}

// ---------------------------------------------------------------------------
// C22: zone-3 count per match, "plotted by match number" per the catalogue
// - a real ordinal sequence index (the array's already-chronological order),
// not a fabricated timestamp.
// ---------------------------------------------------------------------------

function c22Registration(): SemanticRegistration {
  const measure: SemanticMeasure = {
    id: 'value',
    label: 'Zone-3 robots',
    format: numberFormat(0)
  };
  return {
    seasonKey: SEASON,
    catalogueId: 'C22',
    metadata: {
      defaultKind: 'line',
      supportedKinds: ['line', 'bar', 'table'],
      modesByKind: modesFor(['line', 'bar', 'table']),
      measures: [measure],
      defaultMeasureId: 'value',
      higherIsBetter: true
    },
    manifest: {
      catalogueId: 'C22',
      fixtureExpectation: 'nonempty',
      assertions: [
        'Plots by real match sequence order (a 0-based index into the already-chronologically-sorted match list), never a fabricated timestamp'
      ]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const raw = ok.data as unknown as {
        tournamentKey: string;
        matchId: number;
        value: number | null;
      }[];
      if (spec.kind === 'line') {
        const points = raw.map((row, index) => {
          const entity = matchEntity(row.tournamentKey, row.matchId, ctx);
          return {
            x: index,
            value: numericCell(row.value, 'C22/value'),
            label: entity.label
          };
        });
        return createSemanticFrame(
          spec,
          ctx,
          ok,
          lineData(
            'number',
            [
              { id: 'value', label: 'Zone-3 robots per match', measure, points }
            ],
            'Match sequence'
          ),
          {}
        );
      }
      const rows: EntityCells[] = raw.map((row) => ({
        entity: matchEntity(row.tournamentKey, row.matchId, ctx),
        cells: { value: numericCell(row.value, 'C22/value') }
      }));
      return cellsFrame(spec, ctx, ok, rows, [measure]);
    }
  };
}

// ---------------------------------------------------------------------------
// D8: single event-wide "lift specialist" carrier record.
// ---------------------------------------------------------------------------

function d8Registration(): SemanticRegistration {
  const measures: SemanticMeasure[] = [
    { id: 'rate', label: 'Carrier rate', format: percentFormat('ratio', 1) },
    {
      id: 'identifiedMatches',
      label: 'Identified matches',
      format: numberFormat(0)
    },
    {
      id: 'ambiguousMatches',
      label: 'Ambiguous matches',
      format: numberFormat(0)
    }
  ];
  return {
    seasonKey: SEASON,
    catalogueId: 'D8',
    metadata: {
      defaultKind: 'table',
      supportedKinds: ['table'],
      modesByKind: modesFor(['table']),
      measures,
      defaultMeasureId: 'rate',
      higherIsBetter: true
    },
    manifest: {
      catalogueId: 'D8',
      fixtureExpectation: 'nonempty',
      assertions: [
        'Names the single team with the highest unambiguous carrier rate for the event, alongside its identified/ambiguous match counts'
      ]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const { showTeamNames } = spec.options;
      const data = ok.data as unknown as {
        teamKey: number;
        rate: number | null;
        identifiedMatches: number;
        ambiguousMatches: number;
      };
      const team = teamEntity(data.teamKey, ctx, showTeamNames);
      const row = {
        id: team.id,
        label: team.label,
        cells: {
          rate: numericCell(data.rate, 'D8/rate'),
          identifiedMatches: numericCell(
            data.identifiedMatches,
            'D8/identifiedMatches'
          ),
          ambiguousMatches: numericCell(
            data.ambiguousMatches,
            'D8/ambiguousMatches'
          )
        }
      };
      return createSemanticFrame(
        spec,
        ctx,
        ok,
        tableData('table', measures, [row]),
        {}
      );
    }
  };
}

// ---------------------------------------------------------------------------
// Configuration tables for every id handled by factories 1-3 above.
// ---------------------------------------------------------------------------

const TEAM_SIMPLE: SimpleConfig[] = [
  {
    id: 'A10',
    label: 'EPA',
    format: numberFormat(1, 'pts'),
    higherIsBetter: true,
    assertions: [
      'Elo-style predicted-alliance-contribution rating per team, updated match by match'
    ]
  },
  {
    id: 'A12',
    label: 'Normalized EPA',
    format: numberFormat(2),
    higherIsBetter: true,
    assertions: [
      'EPA expressed in field standard deviations from the field mean'
    ]
  },
  {
    id: 'A13',
    label: 'Elo',
    format: numberFormat(0),
    higherIsBetter: true,
    assertions: [
      'Classic Elo rating updated after each match from the win/tie/loss outcome'
    ]
  },
  {
    id: 'A22',
    label: 'Consistency',
    format: numberFormat(1, 'pts'),
    higherIsBetter: false,
    assertions: [
      'Standard deviation of a team’s per-match scoring contribution; lower is steadier'
    ]
  },
  {
    id: 'A24',
    label: 'Strength of schedule (partners)',
    format: numberFormat(1, 'pts'),
    assertions: [
      'Mean OPR of every partner the team has been scheduled with; describes the schedule, not the team’s own merit'
    ]
  },
  {
    id: 'A25',
    label: 'Strength of schedule (opponents)',
    format: numberFormat(1, 'pts'),
    assertions: [
      'Mean OPR of every opponent the team has faced; describes the schedule, not the team’s own merit'
    ]
  },
  {
    id: 'A26',
    label: 'Luck rating',
    format: numberFormat(1, 'pts'),
    assertions: [
      'Actual ranking score minus the ranking score expected from the team’s schedule; a schedule-luck signal, not a merit ranking'
    ]
  },
  {
    id: 'A28',
    label: 'Win %',
    format: percentFormat('ratio', 1),
    higherIsBetter: true,
    assertions: ['Wins divided by matches played, stored as a 0..1 ratio']
  },
  {
    id: 'A29',
    label: 'Ranking Score',
    format: numberFormat(2, 'pts'),
    higherIsBetter: true,
    assertions: [
      'Official qualification ranking score: mean match score with the single lowest dropped'
    ]
  },
  {
    id: 'A31',
    label: 'Rank volatility',
    format: numberFormat(2),
    higherIsBetter: false,
    assertions: [
      'Standard deviation of the team’s rank across the event’s ranking recalculations; lower is more stable'
    ]
  },
  {
    id: 'A32',
    label: 'Highest single match score (TB1)',
    format: numberFormat(1, 'pts'),
    higherIsBetter: true,
    assertions: [
      'Highest alliance score over matches at or below a yellow card, the official first tiebreaker'
    ]
  },
  {
    id: 'A33',
    label: 'Cumulative climb points (TB2)',
    format: numberFormat(2, 'pts'),
    higherIsBetter: true,
    assertions: [
      'Sum of the team’s own brace-state values across the event, the official second tiebreaker'
    ]
  },
  {
    id: 'A35',
    label: 'Score vs field average',
    format: numberFormat(1, 'pts'),
    higherIsBetter: true,
    assertions: [
      'Team’s average alliance score minus the event-wide average alliance score'
    ]
  },
  {
    id: 'A37',
    label: 'Unique partners count',
    format: numberFormat(0),
    assertions: [
      'Distinct teams the team has shared an alliance with; high by design since alliances randomize each ranking match'
    ]
  },
  {
    id: 'A39',
    label: 'Percentile rank',
    format: percentFormat('ratio', 1),
    higherIsBetter: true,
    assertions: [
      '1 minus the team’s normalized rank position on the selected metric'
    ]
  },
  {
    id: 'A40',
    label: 'Form / momentum',
    format: numberFormat(1, 'pts'),
    higherIsBetter: true,
    assertions: [
      'Mean of the most recent window of scores minus the mean of the earliest window'
    ]
  },
  {
    id: 'A41',
    label: 'Trend slope',
    format: numberFormat(2, 'pts'),
    higherIsBetter: true,
    assertions: [
      'Linear-regression slope of the team’s score against match index; positive means improving'
    ]
  },
  {
    id: 'C4',
    label: 'Zone 3 rate',
    format: percentFormat('ratio', 1),
    higherIsBetter: true,
    assertions: [
      'Share of played matches where the team reached brace zone 3 (.30)'
    ]
  },
  {
    id: 'C6',
    label: 'Any-climb rate',
    format: percentFormat('ratio', 1),
    higherIsBetter: true,
    assertions: [
      'Share of played matches where the team braced at all (brace > 0)'
    ]
  },
  {
    id: 'C7',
    label: 'Off-ground rate',
    format: percentFormat('ratio', 1),
    higherIsBetter: true,
    assertions: [
      'Share of played matches where the team reached at least zone 1 (.10), excluding bare contact'
    ]
  },
  {
    id: 'C8',
    label: 'Best zone ever',
    format: numberFormat(2),
    higherIsBetter: true,
    assertions: [
      'The team’s highest brace-state value achieved in any match across the event'
    ]
  },
  {
    id: 'D3',
    label: 'Carried rate',
    format: percentFormat('ratio', 1),
    assertions: [
      'Share of the team’s own matches where its partner-climb flag was set; describes reliance on being carried, not merit'
    ]
  }
];

const MATCH_SIMPLE: SimpleConfig[] = [
  {
    id: 'B1',
    label: 'Suppression balls',
    format: numberFormat(0),
    higherIsBetter: true,
    requiredParams: ['alliance'],
    assertions: [
      'wildfireIn{Red,Blue}SuppressionUnit for the selected alliance, per match'
    ]
  },
  {
    id: 'B2',
    label: 'Extinguisher balls',
    format: numberFormat(0),
    assertions: [
      'wildfireInExtinguisher, a single shared value credited to both alliances'
    ]
  },
  {
    id: 'B3',
    label: 'Total contained',
    format: numberFormat(0),
    assertions: [
      'Sum of red suppression, blue suppression and extinguisher balls for the match'
    ]
  },
  {
    id: 'B4',
    label: 'Containment rate / field clear %',
    format: percentFormat('ratio', 1),
    higherIsBetter: true,
    assertions: ['Total contained divided by the 500-ball field load']
  },
  {
    id: 'B5',
    label: 'Unscored WILDFIRE',
    format: numberFormat(0),
    higherIsBetter: false,
    assertions: [
      '500 minus total contained: balls left on the field, in a robot, or in a chute at 0:00'
    ]
  },
  {
    id: 'B6',
    label: 'Suppression share',
    format: percentFormat('ratio', 1),
    assertions: ['Combined red+blue suppression divided by total contained']
  },
  {
    id: 'B7',
    label: 'Extinguisher share',
    format: percentFormat('ratio', 1),
    assertions: ['Extinguisher balls divided by total contained']
  },
  {
    id: 'B8',
    label: 'Suppression differential',
    format: numberFormat(0),
    assertions: [
      'Red suppression minus blue suppression; signed, can be negative'
    ]
  },
  {
    id: 'B9',
    label: 'Balls per second (match)',
    format: numberFormat(2, 'balls/s'),
    higherIsBetter: true,
    assertions: ['Total contained divided by the 150 s match clock']
  },
  {
    id: 'B10',
    label: 'Balls per second (alliance)',
    format: numberFormat(2, 'balls/s'),
    higherIsBetter: true,
    requiredParams: ['alliance'],
    assertions: [
      'Selected alliance’s suppression balls divided by the 150 s match clock'
    ]
  },
  {
    id: 'B11',
    label: 'Peak scoring window',
    format: numberFormat(0),
    higherIsBetter: true,
    requiredParams: ['windowSeconds'],
    assertions: [
      'Largest ball-count gain over any rolling window of the configured length'
    ]
  },
  {
    id: 'B12',
    label: 'Time to first ball',
    format: numberFormat(1, 's'),
    higherIsBetter: false,
    assertions: [
      'Seconds from actualStartTime to the first positive wildfire scoring event'
    ]
  },
  {
    id: 'B15',
    label: 'Longest drought',
    format: numberFormat(1, 's'),
    higherIsBetter: false,
    requiredParams: ['alliance'],
    assertions: [
      'Largest gap between consecutive scoring events on the selected alliance’s suppression fieldPath'
    ]
  },
  {
    id: 'B18',
    label: 'Score granularity',
    format: numberFormat(2, 'pts'),
    requiredParams: ['alliance'],
    assertions: [
      'Smallest score step the ref could enter: wildfireBallsPerLed times the alliance’s climb multiplier'
    ]
  },
  {
    id: 'B20',
    label: 'Provisional vs final delta',
    format: numberFormat(1, 'pts'),
    requiredParams: ['alliance'],
    assertions: [
      'Selected alliance’s score at the final revision minus its score at the first revision after the buzzer; signed'
    ]
  },
  {
    id: 'C2',
    label: 'Climb multiplier',
    format: numberFormat(2),
    higherIsBetter: true,
    requiredParams: ['alliance'],
    assertions: [
      '1 + the sum of the selected alliance’s three brace-state values'
    ]
  },
  {
    id: 'C3',
    label: 'Multiplier efficiency',
    format: percentFormat('ratio', 1),
    higherIsBetter: true,
    requiredParams: ['alliance'],
    assertions: [
      'Fraction of the theoretical maximum 0.90 climb bonus the alliance achieved'
    ]
  },
  {
    id: 'C14',
    label: 'Endgame swing',
    format: numberFormat(1, 'pts'),
    higherIsBetter: true,
    requiredParams: ['alliance'],
    assertions: [
      'Points the climb multiplier added to the selected alliance’s suppression score'
    ]
  },
  {
    id: 'C15',
    label: 'Alliance climb points added',
    format: numberFormat(1, 'pts'),
    higherIsBetter: true,
    requiredParams: ['alliance'],
    assertions: [
      'Suppression points times (multiplier minus 1) for the selected alliance'
    ]
  },
  {
    id: 'C17',
    label: 'Last brace entry vs buzzer',
    format: numberFormat(1, 's'),
    higherIsBetter: true,
    assertions: [
      'Seconds of buffer between the match-end buzzer and the last brace-state entry logged'
    ]
  },
  {
    id: 'C18',
    label: 'First brace logged in match',
    format: numberFormat(1, 's'),
    higherIsBetter: false,
    assertions: [
      'Seconds from actualStartTime to the first brace-state entry logged across all six stations'
    ]
  },
  {
    id: 'D1',
    label: 'Partner climbs in match',
    format: numberFormat(0),
    higherIsBetter: true,
    requiredParams: ['alliance'],
    assertions: [
      'Count of the selected alliance’s partner-climb flags set true'
    ]
  },
  {
    id: 'D2',
    label: 'Partner climb points',
    format: numberFormat(1, 'pts'),
    higherIsBetter: true,
    requiredParams: ['alliance'],
    assertions: ['25 times the partner-climb count for the selected alliance']
  },
  {
    id: 'D7',
    label: 'Partner climb share of score',
    format: percentFormat('ratio', 1),
    requiredParams: ['alliance'],
    assertions: [
      'Partner-climb points divided by the selected alliance’s total score'
    ]
  }
];

const SCALARS: ScalarConfig[] = [
  {
    id: 'A20',
    label: 'Model Brier score',
    format: numberFormat(3),
    higherIsBetter: false,
    assertions: [
      'Mean squared error of the pre-match win-probability model across the event; lower is better calibration'
    ]
  },
  {
    id: 'B21',
    label: 'Event balls contained',
    format: numberFormat(0),
    assertions: ['Sum of total contained across every match in the event']
  },
  {
    id: 'B22',
    label: 'Event containment rate',
    format: percentFormat('ratio', 1),
    assertions: [
      'Event-wide balls contained divided by 500 times the match count'
    ]
  },
  {
    id: 'C10',
    label: 'Best multiplier of event',
    format: numberFormat(2),
    assertions: [
      'Highest climb multiplier achieved by any alliance in any match across the event'
    ]
  },
  {
    id: 'C21',
    label: 'Event Zone-3 count',
    format: numberFormat(0),
    assertions: [
      'Sum of robots reaching zone 3 (.30) across every match in the event'
    ]
  },
  {
    id: 'D9',
    label: 'Event partner-climb total',
    format: numberFormat(0, 'pts'),
    assertions: [
      'Sum of partner-climb points across both alliances, over every match in the event'
    ]
  }
];

const BOOLEANS: BooleanConfig[] = [
  {
    id: 'C9',
    label: 'Perfect alliance climb',
    higherIsBetter: true,
    requiredParams: ['alliance'],
    assertions: [
      'True only when all three of the selected alliance’s own robots are at brace zone 3 (multiplier 1.90)'
    ]
  },
  {
    id: 'D5',
    label: 'Double-carry',
    higherIsBetter: true,
    requiredParams: ['alliance'],
    assertions: [
      'True when the selected alliance has two partner-climb flags set with exactly one robot on the brace'
    ]
  },
  {
    id: 'D6',
    label: 'Carry + Z3 combo',
    higherIsBetter: true,
    requiredParams: ['alliance'],
    fixtureExpectation: 'source-failure',
    emptyReason:
      'The carrier is only identifiable when exactly one robot on the alliance is braced. In the golden fixture the red alliance always braces all three robots at once, so every match is ambiguous and the whole result collapses to an "unavailable" source failure rather than a row of nulls.',
    assertions: [
      'True when the identifiable carrier is also at brace zone 3 while carrying at least one partner; undefined whenever more than one robot is braced'
    ]
  }
];

const OPR_TABLE: OprConfig[] = [
  {
    id: 'A1',
    label: 'OPR',
    higherIsBetter: true,
    assertions: [
      'Least-squares per-team offensive contribution solved from alliance scores'
    ]
  },
  {
    id: 'A2',
    label: 'Suppression OPR',
    higherIsBetter: true,
    assertions: [
      'Same solve with alliance suppression-unit totals as the target; excludes shared scoring terms'
    ]
  },
  {
    id: 'A3',
    label: 'Pre-multiplier OPR',
    higherIsBetter: true,
    assertions: [
      'Same solve with the multiplied suppression term only, separating fill-rate from alliance strength'
    ]
  },
  {
    id: 'A4',
    label: 'Climb OPR',
    higherIsBetter: true,
    assertions: [
      'Same solve with alliance climb-multiplier minus 1 as the target'
    ]
  },
  {
    id: 'A5',
    label: 'Extinguisher OPR',
    higherIsBetter: true,
    assertions: [
      'Same solve across all six match participants against the shared extinguisher total'
    ]
  },
  {
    id: 'A6',
    label: 'DPR',
    higherIsBetter: false,
    assertions: [
      'OPR minus CCWM, or a direct solve against opponent score; lower means less scored against'
    ]
  },
  {
    id: 'A7',
    label: 'CCWM',
    higherIsBetter: true,
    assertions: [
      'Solve against own score minus opponent score: net per-team contribution to match margin'
    ]
  },
  {
    id: 'A8',
    label: 'Adjusted / ridge OPR',
    higherIsBetter: true,
    requiredParams: ['lambda'],
    assertions: [
      'Ridge-regularized OPR that shrinks low-match-count teams toward the field mean'
    ]
  },
  {
    id: 'A9',
    label: 'iOPR',
    higherIsBetter: true,
    assertions: [
      'OPR iterated by re-seeding the target with the previous round’s residuals until convergence'
    ]
  }
];

// ---------------------------------------------------------------------------
// Record-shaped ids (factory 4).
// ---------------------------------------------------------------------------

function withValueOrNull(
  row: Record<string, unknown>,
  fields: string[]
): Record<string, unknown> | null {
  const value = row.value as Record<string, unknown> | null;
  if (value === null || value === undefined) return null;
  return Object.fromEntries(fields.map((field) => [field, value[field]]));
}

const RECORD_REGISTRATIONS: SemanticRegistration[] = [
  recordRegistration({
    id: 'A11',
    entityKind: 'team',
    defaultMeasureId: 'suppression',
    higherIsBetter: true,
    measures: [
      {
        id: 'suppression',
        label: 'Suppression EPA',
        format: numberFormat(1, 'pts')
      },
      { id: 'climb', label: 'Climb EPA', format: numberFormat(1, 'pts') },
      { id: 'partner', label: 'Partner EPA', format: numberFormat(1, 'pts') }
    ],
    assertions: [
      'Runs the A10 EPA model separately on the suppression, climb-multiplier and partner-climb subscores'
    ],
    extract: (row) => withValueOrNull(row, ['suppression', 'climb', 'partner'])
  }),
  recordRegistration({
    id: 'A14',
    entityKind: 'team',
    defaultMeasureId: 'peak',
    higherIsBetter: true,
    measures: [
      { id: 'peak', label: 'Elo peak', format: numberFormat(0) },
      { id: 'delta', label: 'Elo delta', format: numberFormat(0) }
    ],
    assertions: [
      'Highest Elo reached over the event, and the net change from the initial rating'
    ],
    extract: (row) => withValueOrNull(row, ['peak', 'delta'])
  }),
  recordRegistration({
    id: 'A15',
    entityKind: 'team',
    defaultMeasureId: 'mu',
    higherIsBetter: true,
    measures: [
      { id: 'mu', label: 'Skill (μ)', format: numberFormat(2) },
      { id: 'sigma', label: 'Uncertainty (σ)', format: numberFormat(2) }
    ],
    assertions: [
      'Bayesian skill estimate and its uncertainty, updated per match'
    ],
    extract: (row) => withValueOrNull(row, ['mu', 'sigma'])
  }),
  recordRegistration({
    id: 'A23',
    entityKind: 'team',
    defaultMeasureId: 'ceiling',
    higherIsBetter: true,
    measures: [
      { id: 'floor', label: 'Floor', format: numberFormat(1, 'pts') },
      { id: 'ceiling', label: 'Ceiling', format: numberFormat(1, 'pts') }
    ],
    assertions: [
      'Minimum and maximum of the team’s per-match EPA contribution across the event'
    ],
    extract: (row) => withValueOrNull(row, ['floor', 'ceiling'])
  }),
  recordRegistration({
    id: 'A27',
    entityKind: 'team',
    defaultMeasureId: 'wins',
    higherIsBetter: true,
    measures: [
      { id: 'wins', label: 'Wins', format: numberFormat(0) },
      { id: 'losses', label: 'Losses', format: numberFormat(0) },
      { id: 'ties', label: 'Ties', format: numberFormat(0) },
      { id: 'played', label: 'Played', format: numberFormat(0) }
    ],
    assertions: [
      'Win/loss/tie/played tally per participant station, red below 20 and blue at or above 20'
    ],
    extract: (row) => withValueOrNull(row, ['wins', 'losses', 'ties', 'played'])
  }),
  recordRegistration({
    id: 'A30',
    entityKind: 'team',
    defaultMeasureId: 'rank',
    higherIsBetter: false,
    measures: [
      { id: 'rank', label: 'Rank', format: numberFormat(0) },
      { id: 'rankChange', label: 'Rank change', format: numberFormat(0) }
    ],
    assertions: [
      'Official qualification rank (1 is best) and its change since the previous ranking recalculation'
    ],
    extract: (row) => withValueOrNull(row, ['rank', 'rankChange'])
  }),
  recordRegistration({
    id: 'A34',
    entityKind: 'team',
    defaultMeasureId: 'average',
    higherIsBetter: true,
    measures: [
      { id: 'average', label: 'Average score', format: numberFormat(1, 'pts') },
      { id: 'median', label: 'Median score', format: numberFormat(1, 'pts') }
    ],
    assertions: [
      'Mean and median of the team’s own alliance scores across the event'
    ],
    extract: (row) => withValueOrNull(row, ['average', 'median'])
  }),
  recordRegistration({
    id: 'A36',
    entityKind: 'team',
    defaultMeasureId: 'played',
    measures: [
      { id: 'played', label: 'Matches played', format: numberFormat(0) },
      { id: 'surrogate', label: 'Surrogate count', format: numberFormat(0) }
    ],
    assertions: [
      'Count of matches played, and of those played as a surrogate participant'
    ],
    extract: (row) => withValueOrNull(row, ['played', 'surrogate'])
  }),
  recordRegistration({
    id: 'A38',
    entityKind: 'team',
    defaultMeasureId: 'wins',
    higherIsBetter: true,
    requiredParams: ['opponentTeamKey'],
    measures: [
      { id: 'wins', label: 'Wins', format: numberFormat(0) },
      { id: 'losses', label: 'Losses', format: numberFormat(0) },
      { id: 'ties', label: 'Ties', format: numberFormat(0) }
    ],
    assertions: [
      'Head-to-head record against a specific opponent team across shared matches',
      'A team that never shared a match with the opponent renders a genuinely null record, not a fabricated 0-0-0'
    ],
    extract: (row) => withValueOrNull(row, ['wins', 'losses', 'ties'])
  }),
  recordRegistration({
    id: 'A17',
    entityKind: 'match',
    defaultMeasureId: 'predictedRed',
    measures: [
      {
        id: 'predictedRed',
        label: 'Predicted red score',
        format: numberFormat(1, 'pts')
      },
      {
        id: 'predictedBlue',
        label: 'Predicted blue score',
        format: numberFormat(1, 'pts')
      }
    ],
    assertions: [
      'Sum of each side’s component EPAs plus the shared-term expectation, per match; a prediction, not a merit ranking'
    ],
    extract: (row) => {
      const value = row.value as (number | null)[];
      return { predictedRed: value[0], predictedBlue: value[1] };
    }
  }),
  recordRegistration({
    id: 'B17',
    entityKind: 'match',
    defaultMeasureId: 'extinguisher',
    measures: [
      { id: 'red', label: 'Red divergence', format: numberFormat(0) },
      { id: 'blue', label: 'Blue divergence', format: numberFormat(0) },
      {
        id: 'extinguisher',
        label: 'Extinguisher divergence',
        format: numberFormat(0)
      }
    ],
    assertions: [
      'LED-inferred ball count times wildfireBallsPerLed minus the ref-typed total; a signed data-quality signal, not a merit metric',
      'Zero divergence is the ideal outcome, so no single direction is uniformly "better" and none is asserted'
    ],
    extract: (row) => withValueOrNull(row, ['red', 'blue', 'extinguisher'])
  }),
  recordRegistration({
    id: 'B19',
    entityKind: 'match',
    defaultMeasureId: 'stepShare',
    measures: [
      { id: 'steps', label: 'Step (+/-1) entries', format: numberFormat(0) },
      { id: 'typed', label: 'Typed (>1) entries', format: numberFormat(0) },
      {
        id: 'stepShare',
        label: 'Step share',
        format: percentFormat('ratio', 1)
      }
    ],
    assertions: [
      'Share of suppression events entered as a single +/-1 tap versus a typed total; describes ref entry style, not merit'
    ],
    extract: (row) => withValueOrNull(row, ['steps', 'typed', 'stepShare'])
  }),
  recordRegistration({
    id: 'D4',
    entityKind: 'team',
    defaultMeasureId: 'rate',
    higherIsBetter: true,
    measures: [
      { id: 'rate', label: 'Carrier rate', format: percentFormat('ratio', 1) },
      {
        id: 'identifiedMatches',
        label: 'Identified matches',
        format: numberFormat(0)
      },
      {
        id: 'ambiguousMatches',
        label: 'Ambiguous matches',
        format: numberFormat(0)
      }
    ],
    assertions: [
      'Carrier rate inferred only from matches where the alliance’s carrier is unambiguous (exactly one robot braced)',
      'A team with zero identified matches renders a genuinely null rate, never a fabricated zero'
    ],
    extract: (row) => ({
      rate: row.rate,
      identifiedMatches: row.identifiedMatches,
      ambiguousMatches: row.ambiguousMatches
    })
  }),
  recordRegistration({
    id: 'C5',
    entityKind: 'team',
    defaultMeasureId: 'zoneZ3',
    higherIsBetter: true,
    measures: [
      { id: 'zoneNone', label: 'None (0)', format: numberFormat(0) },
      { id: 'zoneContact', label: 'Contact (.05)', format: numberFormat(0) },
      { id: 'zoneZ1', label: 'Zone 1 (.10)', format: numberFormat(0) },
      { id: 'zoneZ2', label: 'Zone 2 (.20)', format: numberFormat(0) },
      { id: 'zoneZ3', label: 'Zone 3 (.30)', format: numberFormat(0) }
    ],
    assertions: [
      'Histogram of the team’s brace-state level across every match in the event, one count per zone level'
    ],
    extract: (row) => {
      const value = row.value as { brace: number; count: number }[] | null;
      if (!value) return null;
      const levels: [string, number][] = [
        ['zoneNone', 0],
        ['zoneContact', 0.05],
        ['zoneZ1', 0.1],
        ['zoneZ2', 0.2],
        ['zoneZ3', 0.3]
      ];
      return Object.fromEntries(
        levels.map(([id, brace]) => [
          id,
          value.find((entry) => entry.brace === brace)?.count ?? null
        ])
      );
    }
  })
];

// ---------------------------------------------------------------------------
// Full registration list, keyed via `semanticRegistrationKey`.
// ---------------------------------------------------------------------------

export const FGC2026_A_D_REGISTRATIONS: readonly SemanticRegistration[] = [
  ...OPR_TABLE.map(oprRegistration),
  ...TEAM_SIMPLE.map((cfg) => simpleValueRegistration('team', cfg)),
  ...MATCH_SIMPLE.map((cfg) => simpleValueRegistration('match', cfg)),
  ...SCALARS.map(scalarRegistration),
  ...BOOLEANS.map(booleanMatchRegistration),
  ...RECORD_REGISTRATIONS,
  predictionRegistration({
    id: 'A16',
    label: 'Win probability (pre-match)',
    format: percentFormat('ratio', 1),
    assertions: [
      'Logistic win probability for the red alliance from the pre-match EPA gap; describes the match, not a team’s merit'
    ]
  }),
  predictionRegistration({
    id: 'A18',
    label: 'Predicted margin',
    format: numberFormat(1, 'pts'),
    assertions: [
      'Predicted red minus predicted blue score; signed, shared scoring terms cancel'
    ]
  }),
  predictionRegistration({
    id: 'A42',
    label: 'Counterfactual pairing Δ',
    format: numberFormat(1, 'pts'),
    requiredParams: ['partnerTeamKey', 'replacementTeamKey', 'alliance'],
    assertions: [
      'Re-runs the score model swapping one named partner for a named replacement and reports the rating delta; a hypothetical, not a live ranking'
    ]
  }),
  a19Registration(),
  a21Registration(),
  b13Registration(),
  b14Registration(),
  b16Registration(),
  c1Registration(),
  teamMatchListRegistration({
    id: 'C11',
    label: 'Marginal climb value',
    format: numberFormat(1, 'pts'),
    higherIsBetter: true,
    assertions: [
      'Points this specific climb added in this specific match: suppression points times the team’s own brace state'
    ]
  }),
  c12Registration(),
  teamMatchListRegistration({
    id: 'C13',
    label: 'Points forgone by not climbing',
    format: numberFormat(1, 'pts'),
    higherIsBetter: false,
    assertions: [
      'Suppression points times (0.30 minus the team’s actual brace state); lower forgone is better'
    ]
  }),
  teamMatchListRegistration({
    id: 'C16',
    label: 'Brace log time',
    format: numberFormat(1, 's'),
    higherIsBetter: false,
    assertions: [
      'Seconds from actualStartTime to the first non-None brace-state entry logged for that team’s station'
    ]
  }),
  c19Registration(),
  teamMatchListRegistration({
    id: 'C20',
    label: 'Brace call revisions',
    format: numberFormat(0),
    higherIsBetter: false,
    assertions: [
      'Count of brace-state events for a station beyond the first; does not distinguish a ref correction from a robot that fell'
    ]
  }),
  c22Registration(),
  d8Registration()
];

export const fgc2026SemanticPresentationRegistryAD: ReadonlyMap<
  string,
  SemanticRegistration
> = new Map(
  FGC2026_A_D_REGISTRATIONS.map((registration) => [
    // Inlined rather than imported-and-reused to keep this module's public
    // surface self-contained; must stay byte-identical to
    // `semanticRegistrationKey` in ./semantic-helpers.ts.
    JSON.stringify([registration.seasonKey, registration.catalogueId]),
    registration
  ])
);
