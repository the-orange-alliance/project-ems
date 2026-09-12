/**
 * Typed semantic presentation registrations for the FGC2026 "M" catalogue
 * section (M1-M27): the audit-trail / revision-integrity / replay-curve
 * family. This is the most time-series-heavy of the four sections — M16,
 * M17, M26 and M27 are genuine per-second / per-revision replay curves.
 *
 * Design notes (read before touching a specific id):
 *
 *  - Every per-match row is addressed by `matchEntity(tournamentKey,
 *    matchId, ctx)`, never by `matchId` alone — a match id is only unique
 *    within a tournament, and this event has several tournaments (q/r/p/f).
 *
 *  - `value === null` on a source row means "no observation was possible"
 *    (missing snapshot, no actualStartTime, no captured action) and is
 *    always kept as `null`. It is never coerced to `0`, and it is never
 *    silently dropped from a shape that still has a slot for it (a bar/
 *    table row stays in place with a null cell). It is dropped only where
 *    there genuinely is no slot for it — e.g. a line series has no row
 *    concept, so a match with no reconstructable curve contributes no
 *    series at all, which is documented via `notes` / `emptyReason`
 *    instead of being invented.
 *
 *  - `M16`/`M17`/`M26`/`M27` previously (per the audit that produced this
 *    file) had their line x-coordinate populated with a formatted label
 *    instead of a real number. Every line built here passes a genuine
 *    numeric coordinate (`second` or `seconds`, both plain numbers,
 *    including negative pre-match offsets) through `lineData('number',
 *    ...)`, which itself asserts finiteness — see `requireFiniteX` below
 *    and the `NUMERIC_AXIS_FIX` assertions in the paired test file.
 *
 *  - Interpolation is chosen per measure, not defaulted to a smooth line:
 *      - M16 red/blue and M27 red/blue climb multiplier: `step`. Both are
 *        discrete, point-in-time quantities (a score increment, a revision
 *        write) that hold their value until the next change — a straight
 *        line between samples would imply a value that was never observed.
 *      - M17 margin and the `margin` field folded out of M16: `linear`.
 *        The catalogue explicitly separates "M17: shows exactly when the
 *        lead changed hands" as a broadcast lead-tracker; presenting it as
 *        a smooth line makes a lead change read as a clean zero-crossing,
 *        which is the whole point of the graphic.
 *      - M26 threshold: `step`. It is a monotonically increasing discrete
 *        counter (4 -> 5 -> 6) that holds between crossings.
 *
 *  - M15 requires an explicit ISO `atUtc` parameter (the replay instant).
 *    A missing parameter throws a `SemanticPreparationError` immediately;
 *    it is never defaulted to "now" or to `ctx.asOfUtc`.
 */
import {
  type SemanticRegistration,
  type SemanticMeasure,
  type CategoricalInputSeries,
  type LineInputSeries,
  type SemanticTableRow,
  createSemanticFrame,
  requireOkResult,
  tableCell,
  numericCell,
  textCell,
  booleanNumber,
  stableEntityId,
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
import type { AdaptContext } from './adapters.js';
import {
  SUPPORTED_GRAPHIC_MODES,
  type GraphicSpec,
  type MeasureFormat,
  type PresentationData,
  type PresentationFrame
} from '../../../base/Graphics.js';
import type { StatResult } from '../types.js';

const SEASON_KEY = 'fgc_2026';

// ---------------------------------------------------------------------------
// Shared local helpers (deliberately not added to semantic-helpers.ts: these
// are specific to this catalogue section's row shapes).
// ---------------------------------------------------------------------------

/** The universal `matchRows(...)` shape every M-family per-match id uses. */
interface MatchRow<T> {
  eventKey: string;
  tournamentKey: string;
  matchId: number;
  value: T | null;
}

function asMatchRows(data: unknown, catalogueId: string): MatchRow<unknown>[] {
  if (!Array.isArray(data))
    throw new SemanticPreparationError(
      `${catalogueId}: expected an array of per-match rows`
    );
  return data.map((row, i) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new SemanticPreparationError(
        `${catalogueId}[${i}]: expected a match row object`
      );
    }
    const r = row as Record<string, unknown>;
    if (typeof r.tournamentKey !== 'string' || typeof r.matchId !== 'number') {
      throw new SemanticPreparationError(
        `${catalogueId}[${i}]: match row is missing tournament-qualified match identity`
      );
    }
    return {
      eventKey: typeof r.eventKey === 'string' ? r.eventKey : '',
      tournamentKey: r.tournamentKey,
      matchId: r.matchId,
      value: r.value === undefined ? null : r.value
    };
  });
}

function matchEntitiesFor(
  rows: readonly MatchRow<unknown>[],
  ctx: AdaptContext
) {
  return rows.map((row) => matchEntity(row.tournamentKey, row.matchId, ctx));
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}

/** A line x-coordinate must be a real number — never a null placeholder. */
function requireFiniteX(value: unknown, path: string): number {
  const v = numericCell(value, path);
  if (v === null)
    throw new SemanticPreparationError(
      `${path}: a line x-coordinate must not be null`
    );
  return v;
}

/** Mirrors the structural emptiness check `presentationFrameZod` itself performs, so an id
 * can decide up front whether it needs to supply an explicit, documented `emptyReason`. */
function isEmptyData(data: PresentationData): boolean {
  switch (data.kind) {
    case 'stat-tile':
      return data.values.length === 0;
    case 'bar':
    case 'grouped-bar':
    case 'line':
      return data.series.every((series) => series.points.length === 0);
    case 'table':
    case 'ranking-table':
      return data.rows.length === 0;
    default:
      return false;
  }
}

/** Every adapt() ends by calling this: attach `emptyReason` only when the
 * built data is genuinely, structurally empty — never fabricate content to
 * avoid it, and never attach the reason to a frame that has real content. */
function buildFrame(
  spec: GraphicSpec,
  ctx: AdaptContext,
  ok: Extract<StatResult, { status: 'ok' }>,
  data: PresentationData,
  emptyReason: string,
  notes?: string[]
): PresentationFrame {
  const options = isEmptyData(data)
    ? { emptyReason, ...(notes?.length ? { notes } : {}) }
    : { ...(notes?.length ? { notes } : {}) };
  return createSemanticFrame(spec, ctx, ok, data, options);
}

const textFormat: MeasureFormat = { style: 'text', scale: 1 };

// ---------------------------------------------------------------------------
// Factories for the repeated shapes in this section.
// ---------------------------------------------------------------------------

/** M1-M4, M6, M7, M18, M19, M20: one scalar (possibly null) per queried match. */
function simpleMatchBar(
  catalogueId: string,
  label: string,
  format: MeasureFormat,
  higherIsBetter?: boolean
): SemanticRegistration {
  const measure: SemanticMeasure = { id: 'value', label, format };
  return {
    seasonKey: SEASON_KEY,
    catalogueId,
    metadata: {
      defaultKind: 'bar',
      supportedKinds: ['bar'],
      modesByKind: { bar: SUPPORTED_GRAPHIC_MODES.bar },
      measures: [measure],
      defaultMeasureId: measure.id,
      ...(higherIsBetter === undefined ? {} : { higherIsBetter })
    },
    manifest: {
      catalogueId,
      fixtureExpectation: 'nonempty',
      assertions: [
        `${catalogueId}: one bar entity per queried match, addressed by tournament-qualified match identity`,
        `${catalogueId}: a match with no observable value renders as null, never a fabricated zero`
      ]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      const rows = asMatchRows(ok.data, catalogueId);
      const entities = matchEntitiesFor(rows, ctx);
      const series: CategoricalInputSeries = {
        id: 'value',
        label,
        measure,
        points: rows.map((row, i) => ({
          entityId: entities[i].id,
          value: numericCell(row.value, `${catalogueId}/value`)
        }))
      };
      return buildFrame(
        spec,
        ctx,
        ok,
        categoricalData('bar', entities, [series]),
        `No match matched this query for ${catalogueId}`
      );
    }
  };
}

/** M8, M21: one bar per distinct grouping key already computed by the engine. */
function simpleArrayBar(
  catalogueId: string,
  keyField: string,
  label: string,
  format: MeasureFormat
): SemanticRegistration {
  const measure: SemanticMeasure = { id: 'entries', label, format };
  return {
    seasonKey: SEASON_KEY,
    catalogueId,
    metadata: {
      defaultKind: 'bar',
      supportedKinds: ['bar'],
      modesByKind: { bar: SUPPORTED_GRAPHIC_MODES.bar },
      measures: [measure]
    },
    manifest: {
      catalogueId,
      fixtureExpectation: 'nonempty',
      assertions: [
        `${catalogueId}: one bar per distinct ${keyField} observed in the captured audit trail`
      ]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      if (!Array.isArray(ok.data))
        throw new SemanticPreparationError(
          `${catalogueId}: expected an array of grouped entry counts`
        );
      const rows = ok.data as Record<string, unknown>[];
      const entities = rows.map((row) => ({
        id: stableEntityId(catalogueId, String(row[keyField])),
        label: String(row[keyField])
      }));
      const series: CategoricalInputSeries = {
        id: 'entries',
        label,
        measure,
        points: rows.map((row, i) => ({
          entityId: entities[i].id,
          value: numericCell(row.entries, `${catalogueId}/entries`)
        }))
      };
      return buildFrame(
        spec,
        ctx,
        ok,
        categoricalData('bar', entities, [series]),
        `No captured action events were available to group by ${keyField}`
      );
    }
  };
}

/** M10, M11, M25: a single event-wide scalar. */
function simpleScalar(
  catalogueId: string,
  label: string,
  format: MeasureFormat,
  higherIsBetter?: boolean
): SemanticRegistration {
  const measure: SemanticMeasure = { id: 'value', label, format };
  return {
    seasonKey: SEASON_KEY,
    catalogueId,
    metadata: {
      defaultKind: 'stat-tile',
      supportedKinds: ['stat-tile'],
      modesByKind: { 'stat-tile': SUPPORTED_GRAPHIC_MODES['stat-tile'] },
      measures: [measure],
      ...(higherIsBetter === undefined ? {} : { higherIsBetter })
    },
    manifest: {
      catalogueId,
      fixtureExpectation: 'nonempty',
      assertions: [
        `${catalogueId}: a single event-wide scalar; null means no observation was possible, distinct from a measured zero`
      ]
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
// M1-M4, M6, M7, M18-M20: per-match scalar bars
// ---------------------------------------------------------------------------

const M1 = simpleMatchBar('M1', 'Revisions per match', numberFormat(0), false);
const M2 = simpleMatchBar(
  'M2',
  'Post-buzzer revisions',
  numberFormat(0),
  false
);
const M3 = simpleMatchBar(
  'M3',
  'Score correction magnitude',
  numberFormat(1, 'pts'),
  false
);
const M4 = simpleMatchBar('M4', 'Net score correction', numberFormat(1, 'pts'));
const M6 = simpleMatchBar(
  'M6',
  'Time to final score',
  numberFormat(1, 's'),
  false
);
const M7 = simpleMatchBar(
  'M7',
  'Scoring settle time',
  numberFormat(1, 's'),
  false
);
const M18 = simpleMatchBar('M18', 'Lead changes per match', numberFormat(0));
const M19 = simpleMatchBar(
  'M19',
  'Largest deficit overcome',
  numberFormat(1, 'pts')
);
const M20 = simpleMatchBar(
  'M20',
  'Extinguisher write contention',
  numberFormat(0),
  false
);

// ---------------------------------------------------------------------------
// M5: Most-corrected field — per-match ranked field/count list.
// ---------------------------------------------------------------------------

const M5_COLUMNS: SemanticMeasure[] = [
  { id: 'match', label: 'Match', format: textFormat },
  { id: 'field', label: 'Field', format: textFormat },
  { id: 'count', label: 'Corrections', format: numberFormat(0) }
];

const M5: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'M5',
  metadata: {
    defaultKind: 'table',
    supportedKinds: ['table'],
    modesByKind: { table: SUPPORTED_GRAPHIC_MODES.table },
    measures: M5_COLUMNS
  },
  manifest: {
    catalogueId: 'M5',
    fixtureExpectation: 'nonempty',
    assertions: [
      'M5: one row per (match, corrected field) pair, ranked by correction count within that match',
      'M5: a match with fewer than two detail-history snapshots contributes zero rows (documented, not fabricated)',
      'M5: legitimately empty when no queried match has at least two detail-history snapshots'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    const rows = asMatchRows(ok.data, 'M5').filter((row) => row.value !== null);
    const tableRows = flattenTableRows(rows, {
      parentId: (row) => matchEntity(row.tournamentKey, row.matchId, ctx).id,
      path: 'value',
      children: (row) => {
        if (!Array.isArray(row.value))
          throw new SemanticPreparationError(
            'M5: expected an array of field corrections'
          );
        return row.value as { field: string; count: number }[];
      },
      row: (correction, parent) => ({
        label: correction.field,
        cells: {
          match: matchEntity(parent.tournamentKey, parent.matchId, ctx).label,
          field: textCell(correction.field, 'M5/field'),
          count: numericCell(correction.count, 'M5/count')
        }
      })
    });
    return buildFrame(
      spec,
      ctx,
      ok,
      tableData('table', M5_COLUMNS, tableRows),
      'No queried match has at least two detail-history snapshots, so no corrected-field ranking could be computed'
    );
  }
};

// ---------------------------------------------------------------------------
// M8, M21: per-actor / per-field-client entry counts
// ---------------------------------------------------------------------------

const M8 = simpleArrayBar(
  'M8',
  'actorId',
  'Entries per referee',
  numberFormat(0)
);
const M21 = simpleArrayBar(
  'M21',
  'fieldClient',
  'Referee workload by field',
  numberFormat(0)
);

// ---------------------------------------------------------------------------
// M9: Referee press cadence — median gap per (match, actor, field) group.
// ---------------------------------------------------------------------------

const M9_MEASURE: SemanticMeasure = {
  id: 'medianSeconds',
  label: 'Referee press cadence',
  format: numberFormat(1, 's')
};

const M9: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'M9',
  metadata: {
    defaultKind: 'bar',
    supportedKinds: ['bar'],
    modesByKind: { bar: SUPPORTED_GRAPHIC_MODES.bar },
    measures: [M9_MEASURE]
  },
  manifest: {
    catalogueId: 'M9',
    fixtureExpectation: 'nonempty',
    assertions: [
      'M9: one bar per (match, referee, field) group that captured at least one unit-sized physical wildfire edit',
      'M9: medianSeconds is null (not zero) when fewer than two unit taps were captured for a group',
      'M9: legitimately empty when no unit-sized physical wildfire edits were captured at all (referees typed totals instead of tapping +1/-1)'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (!Array.isArray(ok.data))
      throw new SemanticPreparationError(
        'M9: expected an array of cadence groups'
      );
    const groups = ok.data as { group: string; medianSeconds: number | null }[];
    // The group key already self-encodes tournament-qualified match identity
    // (it is built from `keyOf({tournamentKey,id})`), so using it verbatim as
    // the entity id/label preserves that qualification without a brittle
    // re-parse of an internal engine string format.
    const entities = groups.map((group) => ({
      id: stableEntityId('M9-group', group.group),
      label: group.group
    }));
    const series: CategoricalInputSeries = {
      id: 'medianSeconds',
      label: M9_MEASURE.label,
      measure: M9_MEASURE,
      points: groups.map((group, i) => ({
        entityId: entities[i].id,
        value: numericCell(group.medianSeconds, 'M9/medianSeconds')
      }))
    };
    return buildFrame(
      spec,
      ctx,
      ok,
      categoricalData('bar', entities, [series]),
      'No unit-sized physical wildfire edits were captured; referees may have typed totals instead of tapping +1/-1'
    );
  }
};

// ---------------------------------------------------------------------------
// M10, M11, M22, M25: scalars
// ---------------------------------------------------------------------------

const M10 = simpleScalar('M10', 'Average edit size', numberFormat(2), false);
const M11 = simpleScalar(
  'M11',
  'Referee back-out rate',
  percentFormat('ratio', 1),
  false
);
const M25 = simpleScalar(
  'M25',
  'Event-wide correction rate',
  percentFormat('ratio', 1),
  false
);

const M22_MEASURES: SemanticMeasure[] = [
  {
    id: 'rate',
    label: 'Head-ref override rate',
    format: percentFormat('ratio', 1)
  },
  {
    id: 'recognizedRevisions',
    label: 'Recognized revisions',
    format: numberFormat(0)
  },
  {
    id: 'unknownRevisions',
    label: 'Unknown-source revisions',
    format: numberFormat(0)
  }
];

const M22: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'M22',
  metadata: {
    defaultKind: 'stat-tile',
    supportedKinds: ['stat-tile'],
    modesByKind: { 'stat-tile': SUPPORTED_GRAPHIC_MODES['stat-tile'] },
    measures: M22_MEASURES,
    higherIsBetter: false
  },
  manifest: {
    catalogueId: 'M22',
    fixtureExpectation: 'nonempty',
    assertions: [
      'M22: all three scalars are always present together whenever the underlying stat is ok'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    const obj = asRecord(ok.data);
    if (!obj)
      throw new SemanticPreparationError(
        'M22: expected a rate/recognizedRevisions/unknownRevisions object'
      );
    return createSemanticFrame(
      spec,
      ctx,
      ok,
      scalarData(
        M22_MEASURES.map((measure) => ({ measure, value: obj[measure.id] }))
      )
    );
  }
};

// ---------------------------------------------------------------------------
// M12: Action<->snapshot reconciliation — per-match field-level checks.
// ---------------------------------------------------------------------------

const M12_COLUMNS: SemanticMeasure[] = [
  { id: 'match', label: 'Match', format: textFormat },
  { id: 'fieldPath', label: 'Field path', format: textFormat },
  { id: 'replayed', label: 'Replayed value', format: textFormat },
  { id: 'authoritative', label: 'Authoritative value', format: textFormat },
  { id: 'matches', label: 'Reconciled', format: textFormat }
];

const M12: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'M12',
  metadata: {
    defaultKind: 'table',
    supportedKinds: ['table'],
    modesByKind: { table: SUPPORTED_GRAPHIC_MODES.table },
    measures: M12_COLUMNS
  },
  manifest: {
    catalogueId: 'M12',
    fixtureExpectation: 'nonempty',
    assertions: [
      'M12: one row per (match, fieldPath) reconciliation check; a match with zero captured actions contributes zero rows',
      'M12: legitimately empty when no queried match captured any field-level action event'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    const rows = asMatchRows(ok.data, 'M12').filter(
      (row) => row.value !== null
    );
    const tableRows = flattenTableRows(rows, {
      parentId: (row) => matchEntity(row.tournamentKey, row.matchId, ctx).id,
      path: 'value',
      children: (row) => {
        if (!Array.isArray(row.value))
          throw new SemanticPreparationError(
            'M12: expected an array of reconciliation checks'
          );
        return row.value as {
          fieldPath: string;
          replayed: unknown;
          authoritative: unknown;
          matches: boolean;
        }[];
      },
      row: (check, parent) => ({
        label: check.fieldPath,
        cells: {
          match: matchEntity(parent.tournamentKey, parent.matchId, ctx).label,
          fieldPath: check.fieldPath,
          replayed: tableCell(check.replayed, 'M12/replayed'),
          authoritative: tableCell(check.authoritative, 'M12/authoritative'),
          matches: check.matches
        }
      })
    });
    return buildFrame(
      spec,
      ctx,
      ok,
      tableData('table', M12_COLUMNS, tableRows),
      'No queried match captured any field-level action event, so no replay-vs-snapshot reconciliation could be checked'
    );
  }
};

// ---------------------------------------------------------------------------
// M13: Unpersisted action count — per-match pending/unassociated/field counts.
// ---------------------------------------------------------------------------

const M13_MEASURES: SemanticMeasure[] = [
  { id: 'pending', label: 'Pending (unpersisted)', format: numberFormat(0) },
  {
    id: 'unassociated',
    label: 'Unassociated (no revision)',
    format: numberFormat(0)
  },
  {
    id: 'distinctFields',
    label: 'Distinct fields affected',
    format: numberFormat(0)
  }
];

const M13: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'M13',
  metadata: {
    defaultKind: 'grouped-bar',
    supportedKinds: ['grouped-bar'],
    modesByKind: { 'grouped-bar': SUPPORTED_GRAPHIC_MODES['grouped-bar'] },
    measures: M13_MEASURES,
    higherIsBetter: false
  },
  manifest: {
    catalogueId: 'M13',
    fixtureExpectation: 'nonempty',
    assertions: [
      'M13: one grouped bar per queried match with three independent counters',
      'M13: a match with zero captured actions reports null (not zero) for every counter',
      'M13: distinctFields is a genuine derived count (the length of the source fields breakdown array), never fabricated'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    const rows = asMatchRows(ok.data, 'M13');
    const entities = matchEntitiesFor(rows, ctx);
    const series: CategoricalInputSeries[] = M13_MEASURES.map((measure) => ({
      id: measure.id,
      label: measure.label,
      measure,
      points: rows.map((row, i) => {
        if (row.value === null)
          return { entityId: entities[i].id, value: null };
        const v = row.value as {
          pending: number;
          unassociated: number;
          fields: unknown[];
        };
        const raw =
          measure.id === 'distinctFields'
            ? Array.isArray(v.fields)
              ? v.fields.length
              : null
            : measure.id === 'pending'
              ? v.pending
              : v.unassociated;
        return {
          entityId: entities[i].id,
          value: numericCell(raw, `M13/${measure.id}`)
        };
      })
    }));
    return buildFrame(
      spec,
      ctx,
      ok,
      categoricalData('grouped-bar', entities, series),
      'No match matched this query for M13'
    );
  }
};

// ---------------------------------------------------------------------------
// M14: Realtime -> API latency — per-match mean latency / unassociated count.
// ---------------------------------------------------------------------------

const M14_MEASURES: SemanticMeasure[] = [
  {
    id: 'meanSeconds',
    label: 'Mean realtime→API latency',
    format: numberFormat(2, 's')
  },
  { id: 'unassociated', label: 'Unassociated actions', format: numberFormat(0) }
];

const M14: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'M14',
  metadata: {
    defaultKind: 'grouped-bar',
    supportedKinds: ['grouped-bar'],
    modesByKind: { 'grouped-bar': SUPPORTED_GRAPHIC_MODES['grouped-bar'] },
    measures: M14_MEASURES,
    higherIsBetter: false
  },
  manifest: {
    catalogueId: 'M14',
    fixtureExpectation: 'nonempty',
    assertions: [
      'M14: one grouped bar per queried match; meanSeconds is null when no action-to-revision pairing could be established',
      'M14: the individual per-action latency entries remain in the source result but are summarized here, not enumerated'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    const rows = asMatchRows(ok.data, 'M14');
    const entities = matchEntitiesFor(rows, ctx);
    const series: CategoricalInputSeries[] = M14_MEASURES.map((measure) => ({
      id: measure.id,
      label: measure.label,
      measure,
      points: rows.map((row, i) => {
        if (row.value === null)
          return { entityId: entities[i].id, value: null };
        const v = row.value as {
          meanSeconds: number | null;
          unassociated: number;
        };
        const raw =
          measure.id === 'meanSeconds' ? v.meanSeconds : v.unassociated;
        return {
          entityId: entities[i].id,
          value: numericCell(raw, `M14/${measure.id}`)
        };
      })
    }));
    return buildFrame(
      spec,
      ctx,
      ok,
      categoricalData('grouped-bar', entities, series),
      'No match matched this query for M14'
    );
  }
};

// ---------------------------------------------------------------------------
// M15: Match state at time T — requires an explicit ISO `atUtc` parameter.
// ---------------------------------------------------------------------------

const M15_COLUMNS: SemanticMeasure[] = [
  { id: 'redScore', label: 'Red score', format: numberFormat(0, 'pts') },
  { id: 'blueScore', label: 'Blue score', format: numberFormat(0, 'pts') },
  { id: 'timeLeft', label: 'Time left', format: numberFormat(1, 's') },
  { id: 'matchState', label: 'Match state', format: numberFormat(0) },
  { id: 'inProgress', label: 'In progress', format: numberFormat(0) }
];

const M15: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'M15',
  metadata: {
    defaultKind: 'table',
    supportedKinds: ['table'],
    modesByKind: { table: SUPPORTED_GRAPHIC_MODES.table },
    measures: M15_COLUMNS,
    requiredParams: ['atUtc']
  },
  manifest: {
    catalogueId: 'M15',
    fixtureExpectation: 'nonempty',
    assertions: [
      'M15: requires an explicit ISO atUtc parameter identifying the replay instant; a missing atUtc is a documented preparation failure, never a fabricated default (e.g. "now")',
      'M15: a match with no captured snapshot at or before atUtc renders every cell as null, not a fabricated zero'
    ]
  },
  adapt(result, spec, ctx) {
    const { atUtc } = spec.params;
    if (typeof atUtc !== 'string' || Number.isNaN(Date.parse(atUtc))) {
      throw new SemanticPreparationError(
        'M15 requires an explicit ISO atUtc parameter identifying the replay instant; none was provided'
      );
    }
    const ok = requireOkResult(result);
    const rows = asMatchRows(ok.data, 'M15');
    const tableRows: SemanticTableRow[] = rows.map((row) => {
      const entity = matchEntity(row.tournamentKey, row.matchId, ctx);
      const value = asRecord(row.value);
      const match = value ? asRecord(value.match) : undefined;
      const clock = value ? asRecord(value.clock) : undefined;
      return {
        id: entity.id,
        label: entity.label,
        cells: {
          redScore: match ? numericCell(match.redScore, 'M15/redScore') : null,
          blueScore: match
            ? numericCell(match.blueScore, 'M15/blueScore')
            : null,
          timeLeft: clock ? numericCell(clock.timeLeft, 'M15/timeLeft') : null,
          matchState: clock
            ? numericCell(clock.matchState, 'M15/matchState')
            : null,
          inProgress: clock
            ? booleanNumber(clock.inProgress, 'M15/inProgress')
            : null
        }
      };
    });
    return buildFrame(
      spec,
      ctx,
      ok,
      tableData('table', M15_COLUMNS, tableRows),
      'No match matched this query for M15'
    );
  }
};

// ---------------------------------------------------------------------------
// M16: Score-at-any-second curve (defect fix: numeric `second` x-axis).
// ---------------------------------------------------------------------------

const M16_MEASURES: SemanticMeasure[] = [
  { id: 'red', label: 'Red score', format: numberFormat(1, 'pts') },
  { id: 'blue', label: 'Blue score', format: numberFormat(1, 'pts') }
];

const M16: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'M16',
  metadata: {
    defaultKind: 'line',
    supportedKinds: ['line'],
    modesByKind: { line: SUPPORTED_GRAPHIC_MODES.line },
    measures: M16_MEASURES
  },
  manifest: {
    catalogueId: 'M16',
    fixtureExpectation: 'nonempty',
    assertions: [
      'M16: x-coordinate is the numeric elapsed second, never the formatted atUtc string',
      'M16: red/blue score series use step interpolation because score is a discrete, point-in-time increment',
      'M16: series are grouped by stable, tournament-qualified match identity and kept chronological',
      'M16: legitimately empty when no queried match has a captured actualStartTime and base/detail snapshot pair to replay'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    const rows = asMatchRows(ok.data, 'M16');
    const series: LineInputSeries[] = [];
    for (const row of rows) {
      if (row.value === null) continue;
      if (!Array.isArray(row.value))
        throw new SemanticPreparationError(
          'M16: expected an array of per-second samples'
        );
      const samples = row.value as {
        second: number;
        atUtc: string;
        red: number;
        blue: number;
        margin: number;
      }[];
      const entity = matchEntity(row.tournamentKey, row.matchId, ctx);
      for (const measure of M16_MEASURES) {
        series.push({
          id: `${entity.id}:${measure.id}`,
          label: `${entity.label} · ${measure.label}`,
          measure,
          interpolation: 'step',
          points: samples.map((sample) => ({
            x: requireFiniteX(sample.second, 'M16/second'),
            value: numericCell(
              measure.id === 'red' ? sample.red : sample.blue,
              `M16/${measure.id}`
            )
          }))
        });
      }
    }
    return buildFrame(
      spec,
      ctx,
      ok,
      lineData('number', series, 'Elapsed seconds'),
      'No queried match has a captured actualStartTime and base/detail snapshot pair, so no score-at-any-second curve could be replayed'
    );
  }
};

// ---------------------------------------------------------------------------
// M17: Live margin curve (defect fix: numeric `second` x-axis).
// ---------------------------------------------------------------------------

const M17_MEASURE: SemanticMeasure = {
  id: 'margin',
  label: 'Live margin (red − blue)',
  format: numberFormat(1, 'pts')
};

const M17: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'M17',
  metadata: {
    defaultKind: 'line',
    supportedKinds: ['line'],
    modesByKind: { line: SUPPORTED_GRAPHIC_MODES.line },
    measures: [M17_MEASURE]
  },
  manifest: {
    catalogueId: 'M17',
    fixtureExpectation: 'nonempty',
    assertions: [
      'M17: x-coordinate is the numeric elapsed second, never a formatted label',
      'M17: margin uses linear (continuous) interpolation — presented as a smooth broadcast lead-tracker so a lead change reads as a clean zero-crossing, unlike the discrete M16 score series',
      'M17: legitimately empty when no queried match has a reconstructable score replay'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    const rows = asMatchRows(ok.data, 'M17');
    const series: LineInputSeries[] = [];
    for (const row of rows) {
      if (row.value === null) continue;
      if (!Array.isArray(row.value))
        throw new SemanticPreparationError(
          'M17: expected an array of per-second margin samples'
        );
      const samples = row.value as { second: number; margin: number }[];
      const entity = matchEntity(row.tournamentKey, row.matchId, ctx);
      series.push({
        id: entity.id,
        label: entity.label,
        measure: M17_MEASURE,
        interpolation: 'linear',
        points: samples.map((sample) => ({
          x: requireFiniteX(sample.second, 'M17/second'),
          value: numericCell(sample.margin, 'M17/margin')
        }))
      });
    }
    return buildFrame(
      spec,
      ctx,
      ok,
      lineData('number', series, 'Elapsed seconds'),
      'No queried match has a reconstructable score replay, so no live-margin curve could be computed'
    );
  }
};

// ---------------------------------------------------------------------------
// M23: Which ref called which match — per-match actor credit roll.
// ---------------------------------------------------------------------------

const M23_COLUMNS: SemanticMeasure[] = [
  { id: 'match', label: 'Match', format: textFormat },
  { id: 'actor', label: 'Referee / operator', format: textFormat }
];

const M23: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'M23',
  metadata: {
    defaultKind: 'table',
    supportedKinds: ['table'],
    modesByKind: { table: SUPPORTED_GRAPHIC_MODES.table },
    measures: M23_COLUMNS
  },
  manifest: {
    catalogueId: 'M23',
    fixtureExpectation: 'nonempty',
    assertions: [
      'M23: one row per (match, actor) credit pair; a match with no captured actor names contributes zero rows',
      'M23: legitimately empty when no queried match captured any actorName'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (!Array.isArray(ok.data))
      throw new SemanticPreparationError(
        'M23: expected an array of per-match actor rows'
      );
    const rows = ok.data as {
      tournamentKey: string;
      matchId: number;
      actors: string[];
    }[];
    const tableRows = flattenTableRows(rows, {
      parentId: (row) => matchEntity(row.tournamentKey, row.matchId, ctx).id,
      path: 'actors',
      children: (row) => {
        if (!Array.isArray(row.actors))
          throw new SemanticPreparationError('M23: expected an actors array');
        return row.actors;
      },
      row: (actor, parent) => ({
        label: actor,
        cells: {
          match: matchEntity(parent.tournamentKey, parent.matchId, ctx).label,
          actor: textCell(actor, 'M23/actor')
        }
      })
    });
    return buildFrame(
      spec,
      ctx,
      ok,
      tableData('table', M23_COLUMNS, tableRows),
      'No queried match captured an actorName; the credit-roll table has nothing to show'
    );
  }
};

// ---------------------------------------------------------------------------
// M24: Contested match index — per-match composite of five counters.
// ---------------------------------------------------------------------------

const M24_COLUMNS: SemanticMeasure[] = [
  { id: 'index', label: 'Contested match index', format: numberFormat(1) },
  { id: 'revisions', label: 'Revisions', format: numberFormat(0) },
  {
    id: 'absoluteScoreCorrection',
    label: 'Absolute score correction',
    format: numberFormat(1, 'pts')
  },
  {
    id: 'backoutRate',
    label: 'Back-out rate',
    format: percentFormat('ratio', 1)
  },
  { id: 'foulCorrections', label: 'Foul corrections', format: numberFormat(0) }
];

const M24: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'M24',
  metadata: {
    defaultKind: 'table',
    supportedKinds: ['table'],
    modesByKind: { table: SUPPORTED_GRAPHIC_MODES.table },
    measures: M24_COLUMNS,
    higherIsBetter: false
  },
  manifest: {
    catalogueId: 'M24',
    fixtureExpectation: 'nonempty',
    assertions: [
      'M24: one row per queried match with five independent composite counters, tournament-qualified',
      'M24: a match missing any required input renders every cell as null, not a fabricated zero'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    const rows = asMatchRows(ok.data, 'M24');
    const tableRows: SemanticTableRow[] = rows.map((row) => {
      const entity = matchEntity(row.tournamentKey, row.matchId, ctx);
      const v = row.value as {
        index: number;
        revisions: number;
        absoluteScoreCorrection: number;
        backoutRate: number;
        foulCorrections: number;
      } | null;
      return {
        id: entity.id,
        label: entity.label,
        cells: {
          index: v ? numericCell(v.index, 'M24/index') : null,
          revisions: v ? numericCell(v.revisions, 'M24/revisions') : null,
          absoluteScoreCorrection: v
            ? numericCell(
                v.absoluteScoreCorrection,
                'M24/absoluteScoreCorrection'
              )
            : null,
          backoutRate: v ? numericCell(v.backoutRate, 'M24/backoutRate') : null,
          foulCorrections: v
            ? numericCell(v.foulCorrections, 'M24/foulCorrections')
            : null
        }
      };
    });
    return buildFrame(
      spec,
      ctx,
      ok,
      tableData('table', M24_COLUMNS, tableRows),
      'No match matched this query for M24'
    );
  }
};

// ---------------------------------------------------------------------------
// M26: Coopertition flip timing (defect fix: numeric `seconds` x-axis).
// ---------------------------------------------------------------------------

const M26_MEASURE: SemanticMeasure = {
  id: 'threshold',
  label: 'Coopertition threshold reached',
  format: numberFormat(0)
};

const M26: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'M26',
  metadata: {
    defaultKind: 'line',
    supportedKinds: ['line'],
    modesByKind: { line: SUPPORTED_GRAPHIC_MODES.line },
    measures: [M26_MEASURE]
  },
  manifest: {
    catalogueId: 'M26',
    fixtureExpectation: 'nonempty',
    assertions: [
      'M26: x-coordinate is the numeric elapsed second since actualStartTime, never the atUtc string',
      'M26: threshold uses step interpolation — a monotonically increasing discrete counter (4/5/6) held constant between crossings',
      'M26: a crossing whose seconds offset could not be computed (no actualStartTime) is excluded from the plotted line and reported in notes, never plotted at a fabricated x',
      'M26: legitimately empty when no queried match ever crossed the 4/5/6 coopertition threshold'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    const rows = asMatchRows(ok.data, 'M26');
    const series: LineInputSeries[] = [];
    const notes: string[] = [];
    for (const row of rows) {
      if (row.value === null) continue;
      if (!Array.isArray(row.value))
        throw new SemanticPreparationError(
          'M26: expected an array of threshold crossings'
        );
      const crossings = row.value as {
        threshold: number;
        atUtc: string;
        seconds: number | null;
      }[];
      const entity = matchEntity(row.tournamentKey, row.matchId, ctx);
      const located = crossings.filter((crossing) => crossing.seconds !== null);
      if (located.length < crossings.length) {
        notes.push(
          `${entity.label}: ${crossings.length - located.length} threshold crossing(s) omitted — no actualStartTime anchor to compute an elapsed-second offset`
        );
      }
      if (located.length === 0) continue;
      series.push({
        id: entity.id,
        label: entity.label,
        measure: M26_MEASURE,
        interpolation: 'step',
        points: located.map((crossing) => ({
          x: requireFiniteX(crossing.seconds, 'M26/seconds'),
          value: numericCell(crossing.threshold, 'M26/threshold')
        }))
      });
    }
    return buildFrame(
      spec,
      ctx,
      ok,
      lineData('number', series, 'Elapsed seconds'),
      'No queried match ever crossed the coopertition 4/5/6 threshold, so no flip-timing curve exists',
      notes
    );
  }
};

// ---------------------------------------------------------------------------
// M27: Multiplier trajectory (defect fix: numeric `seconds` x-axis).
// ---------------------------------------------------------------------------

const M27_MEASURES: SemanticMeasure[] = [
  { id: 'red', label: 'Red climb multiplier', format: numberFormat(2) },
  { id: 'blue', label: 'Blue climb multiplier', format: numberFormat(2) }
];

const M27: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'M27',
  metadata: {
    defaultKind: 'line',
    supportedKinds: ['line'],
    modesByKind: { line: SUPPORTED_GRAPHIC_MODES.line },
    measures: M27_MEASURES
  },
  manifest: {
    catalogueId: 'M27',
    fixtureExpectation: 'nonempty',
    assertions: [
      'M27: x-coordinate is the numeric match-relative elapsed second, including genuinely negative pre-match revisions',
      'M27: red/blue climb multiplier uses step interpolation — a revision-driven discrete value held constant between detail-history snapshots',
      'M27: a revision whose seconds offset could not be computed (no actualStartTime) is excluded from the plotted line, never plotted at a fabricated x',
      'M27: legitimately empty when no detail-history snapshot exists for any queried match'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    const rows = asMatchRows(ok.data, 'M27');
    const series: LineInputSeries[] = [];
    const notes: string[] = [];
    for (const row of rows) {
      if (row.value === null) continue;
      if (!Array.isArray(row.value))
        throw new SemanticPreparationError(
          'M27: expected an array of per-revision multiplier samples'
        );
      const revisions = row.value as {
        revision: number | null;
        seconds: number | null;
        red: number | null;
        blue: number | null;
      }[];
      const entity = matchEntity(row.tournamentKey, row.matchId, ctx);
      const located = revisions.filter((revision) => revision.seconds !== null);
      if (located.length < revisions.length) {
        notes.push(
          `${entity.label}: ${revisions.length - located.length} revision(s) omitted — no actualStartTime anchor to compute an elapsed-second offset`
        );
      }
      if (located.length === 0) continue;
      for (const measure of M27_MEASURES) {
        series.push({
          id: `${entity.id}:${measure.id}`,
          label: `${entity.label} · ${measure.label}`,
          measure,
          interpolation: 'step',
          points: located.map((revision) => ({
            x: requireFiniteX(revision.seconds, 'M27/seconds'),
            value: numericCell(
              measure.id === 'red' ? revision.red : revision.blue,
              `M27/${measure.id}`
            )
          }))
        });
      }
    }
    return buildFrame(
      spec,
      ctx,
      ok,
      lineData('number', series, 'Elapsed seconds'),
      'No detail-history snapshot exists for any queried match, so no multiplier trajectory could be reconstructed',
      notes
    );
  }
};

// ---------------------------------------------------------------------------
// Barrel export
// ---------------------------------------------------------------------------

export const fgc2026MRegistrations: SemanticRegistration[] = [
  M1,
  M2,
  M3,
  M4,
  M5,
  M6,
  M7,
  M8,
  M9,
  M10,
  M11,
  M12,
  M13,
  M14,
  M15,
  M16,
  M17,
  M18,
  M19,
  M20,
  M21,
  M22,
  M23,
  M24,
  M25,
  M26,
  M27
];
