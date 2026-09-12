/**
 * Typed semantic presentation registrations for every FGC2026 catalogue id
 * beginning E, F, G, or H (58 ids: E1-E13, F1-F17, G1-G14, H1-H14).
 *
 * Each registration turns the exact `data` shape documented for its id in
 * `../result-schemas.ts` (ground truth verified against
 * `../tests/golden.json`) into a v2 semantic `PresentationData` payload
 * using only the primitives exported by `./semantic-helpers.js`. This module
 * does not touch the shared registry, the legacy adapter, or the family /
 * presentation metadata tables — it is a standalone, additive export
 * intended to be wired in by a later integration task.
 *
 * Two documented legacy-adapter defects are specifically fixed here:
 *  - H6 ("Per-30s segment scoring"): the legacy adapter produced a category
 *    label like `Match 1 @ 30s` on what should be a numeric time axis. Here
 *    the x-coordinate is the raw `fromSeconds` number (numeric, chronological
 *    within each match), and the human string (`"0-30s"`) is carried
 *    separately as `point.label`. Curves are grouped by tournament-qualified
 *    match identity (`matchEntity`), never by a shared display string.
 *  - H12 ("Live rank-if-ended-now"): the legacy adapter derived table
 *    identity from `climbPoints` and implied ordering from array position.
 *    Here row identity is the tournament-qualified team
 *    (`stableEntityId('team-ranking', tournamentKey, teamKey)`), and `rank`
 *    is carried verbatim from the source ranking row as the table's
 *    authoritative `rank` field (enforced by `tableData`'s ranking-table
 *    validation), never recomputed from where the row landed in the array.
 */
import {
  createSemanticFrame,
  categoricalData,
  flattenTableRows,
  histogramData,
  lineData,
  matchEntity,
  numberFormat,
  numericCell,
  percentFormat,
  requireOkResult,
  scalarData,
  semanticRegistrationKey,
  SemanticPreparationError,
  stableEntityId,
  tableCell,
  tableData,
  teamEntity,
  type SemanticCell,
  type SemanticEntity,
  type SemanticMeasure,
  type SemanticRegistration
} from './semantic-helpers.js';
import {
  SUPPORTED_GRAPHIC_MODES,
  type GraphicKind,
  type MeasureFormat,
  type PresentationMode
} from '../../../base/Graphics.js';

const SEASON_KEY = 'fgc_2026';

// ---------------------------------------------------------------------------
// Shared formats
// ---------------------------------------------------------------------------

const pts = (precision = 1): MeasureFormat => numberFormat(precision, 'pts');
const countFmt = (unit = ''): MeasureFormat => numberFormat(0, unit);
const ratioPercent = (): MeasureFormat => percentFormat('ratio', 1);
const secondsFmt = (precision = 1): MeasureFormat =>
  numberFormat(precision, 's');
const msFmt = (): MeasureFormat => numberFormat(0, 'ms');
const textFmt: MeasureFormat = { style: 'text', scale: 1 };

function modesFor(
  kind: GraphicKind
): Partial<Record<GraphicKind, readonly PresentationMode[]>> {
  return { [kind]: SUPPORTED_GRAPHIC_MODES[kind] };
}

// ---------------------------------------------------------------------------
// Minimal, locally-scoped shapes mirroring ../result-schemas.ts for E-H ids
// ---------------------------------------------------------------------------

interface MatchRow<T> {
  eventKey: string;
  tournamentKey: string;
  matchId: number;
  value: T | null;
}
interface TeamRow<T> {
  teamKey: number;
  value: T | null;
}

function asMatchRows<T = unknown>(
  data: unknown,
  catalogueId: string
): MatchRow<T>[] {
  if (!Array.isArray(data))
    throw new SemanticPreparationError(
      `${catalogueId}: expected an array of per-match rows`
    );
  return data as MatchRow<T>[];
}
function asTeamRows<T = unknown>(
  data: unknown,
  catalogueId: string
): TeamRow<T>[] {
  if (!Array.isArray(data))
    throw new SemanticPreparationError(
      `${catalogueId}: expected an array of per-team rows`
    );
  return data as TeamRow<T>[];
}
function asArray<T = unknown>(data: unknown, catalogueId: string): T[] {
  if (!Array.isArray(data))
    throw new SemanticPreparationError(`${catalogueId}: expected an array`);
  return data as T[];
}

// ---------------------------------------------------------------------------
// Generic builders shared by many ids with the same result shape
// ---------------------------------------------------------------------------

/** `matchRows(n)` -> one bar per tournament-qualified match. Used by 21 simple per-match scalars. */
function matchScalarBar(
  catalogueId: string,
  measureId: string,
  measureLabel: string,
  format: MeasureFormat,
  opts: { requiredParams?: readonly string[] } = {}
): SemanticRegistration {
  const measure: SemanticMeasure = {
    id: measureId,
    label: measureLabel,
    format
  };
  return {
    seasonKey: SEASON_KEY,
    catalogueId,
    metadata: {
      defaultKind: 'bar',
      supportedKinds: ['bar'],
      modesByKind: modesFor('bar'),
      measures: [measure],
      defaultMeasureId: measure.id,
      ...(opts.requiredParams ? { requiredParams: opts.requiredParams } : {})
    },
    manifest: {
      catalogueId,
      fixtureExpectation: 'nonempty',
      assertions: [
        `${catalogueId}: one bar per tournament-qualified match, identity from (tournamentKey, matchId)`,
        `${catalogueId}: real zero and null observations are preserved, never coerced`
      ]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      if (spec.kind !== 'bar')
        throw new SemanticPreparationError(
          `${catalogueId}: unsupported presentation kind ${spec.kind}`
        );
      const rows = asMatchRows<number>(ok.data, catalogueId);
      const entities = rows.map((row) =>
        matchEntity(row.tournamentKey, row.matchId, ctx)
      );
      const data = categoricalData('bar', entities, [
        {
          id: measureId,
          label: measureLabel,
          measure,
          points: rows.map((row, i) => ({
            entityId: entities[i].id,
            value: numericCell(row.value, `${catalogueId}[${i}].value`)
          }))
        }
      ]);
      return createSemanticFrame(spec, ctx, ok, data);
    }
  };
}

/** `teamRows(n)` -> one bar per team. Used by E9 and G5. */
function teamScalarBar(
  catalogueId: string,
  measureId: string,
  measureLabel: string,
  format: MeasureFormat,
  higherIsBetter?: boolean
): SemanticRegistration {
  const measure: SemanticMeasure = {
    id: measureId,
    label: measureLabel,
    format
  };
  return {
    seasonKey: SEASON_KEY,
    catalogueId,
    metadata: {
      defaultKind: 'bar',
      supportedKinds: ['bar'],
      modesByKind: modesFor('bar'),
      measures: [measure],
      defaultMeasureId: measure.id,
      ...(higherIsBetter !== undefined ? { higherIsBetter } : {})
    },
    manifest: {
      catalogueId,
      fixtureExpectation: 'nonempty',
      assertions: [
        `${catalogueId}: one bar per team`,
        `${catalogueId}: real zero and null observations are preserved, never coerced`
      ]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      if (spec.kind !== 'bar')
        throw new SemanticPreparationError(
          `${catalogueId}: unsupported presentation kind ${spec.kind}`
        );
      const rows = asTeamRows<number>(ok.data, catalogueId);
      const entities = rows.map((row) =>
        teamEntity(row.teamKey, ctx, spec.options.showTeamNames)
      );
      const data = categoricalData('bar', entities, [
        {
          id: measureId,
          label: measureLabel,
          measure,
          points: rows.map((row, i) => ({
            entityId: entities[i].id,
            value: numericCell(row.value, `${catalogueId}[${i}].value`)
          }))
        }
      ]);
      return createSemanticFrame(spec, ctx, ok, data);
    }
  };
}

/** Bare `n` (or ratio) event-wide scalar -> stat-tile. */
function scalarStatTile(
  catalogueId: string,
  measureId: string,
  measureLabel: string,
  format: MeasureFormat
): SemanticRegistration {
  const measure: SemanticMeasure = {
    id: measureId,
    label: measureLabel,
    format
  };
  return {
    seasonKey: SEASON_KEY,
    catalogueId,
    metadata: {
      defaultKind: 'stat-tile',
      supportedKinds: ['stat-tile'],
      modesByKind: modesFor('stat-tile'),
      measures: [measure],
      defaultMeasureId: measure.id
    },
    manifest: {
      catalogueId,
      fixtureExpectation: 'nonempty',
      assertions: [`${catalogueId}: a single event-scoped scalar`]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      if (spec.kind !== 'stat-tile')
        throw new SemanticPreparationError(
          `${catalogueId}: unsupported presentation kind ${spec.kind}`
        );
      const data = scalarData([{ measure, value: ok.data }]);
      return createSemanticFrame(spec, ctx, ok, data);
    }
  };
}

/** `matchRows(object)` -> one table row per match, one column per declared field. */
function matchObjectTable(
  catalogueId: string,
  columns: SemanticMeasure[],
  assertions: string[]
): SemanticRegistration {
  return {
    seasonKey: SEASON_KEY,
    catalogueId,
    metadata: {
      defaultKind: 'table',
      supportedKinds: ['table'],
      modesByKind: modesFor('table'),
      measures: columns,
      defaultMeasureId: columns[0]?.id
    },
    manifest: { catalogueId, fixtureExpectation: 'nonempty', assertions },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      if (spec.kind !== 'table')
        throw new SemanticPreparationError(
          `${catalogueId}: unsupported presentation kind ${spec.kind}`
        );
      const rows = asMatchRows<Record<string, unknown>>(ok.data, catalogueId);
      const tableRows = rows.map((row) => {
        const match = matchEntity(row.tournamentKey, row.matchId, ctx);
        const cells: Record<string, SemanticCell> = {};
        for (const column of columns) {
          cells[column.id] = tableCell(
            row.value ? row.value[column.id] : undefined,
            `${catalogueId}/${match.id}/${column.id}`
          );
        }
        return { id: match.id, label: match.label, cells };
      });
      const data = tableData('table', columns, tableRows);
      return createSemanticFrame(spec, ctx, ok, data);
    }
  };
}

/** `matchRows(object)` of several same-unit numeric fields -> grouped-bar, one series per field. */
function matchObjectGroupedBar(
  catalogueId: string,
  fields: readonly { id: string; label: string }[],
  format: MeasureFormat,
  assertions: string[]
): SemanticRegistration {
  const measures: SemanticMeasure[] = fields.map((f) => ({
    id: f.id,
    label: f.label,
    format
  }));
  return {
    seasonKey: SEASON_KEY,
    catalogueId,
    metadata: {
      defaultKind: 'grouped-bar',
      supportedKinds: ['grouped-bar'],
      modesByKind: modesFor('grouped-bar'),
      measures,
      defaultMeasureId: measures[0]?.id
    },
    manifest: { catalogueId, fixtureExpectation: 'nonempty', assertions },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      if (spec.kind !== 'grouped-bar')
        throw new SemanticPreparationError(
          `${catalogueId}: unsupported presentation kind ${spec.kind}`
        );
      const rows = asMatchRows<Record<string, number>>(ok.data, catalogueId);
      const entities = rows.map((row) =>
        matchEntity(row.tournamentKey, row.matchId, ctx)
      );
      const data = categoricalData(
        'grouped-bar',
        entities,
        measures.map((measure) => ({
          id: measure.id,
          label: measure.label,
          measure,
          points: rows.map((row, i) => ({
            entityId: entities[i].id,
            value: numericCell(
              row.value ? row.value[measure.id] : null,
              `${catalogueId}[${i}].value.${measure.id}`
            )
          }))
        }))
      );
      return createSemanticFrame(spec, ctx, ok, data);
    }
  };
}

// ---------------------------------------------------------------------------
// E: coopertition
// ---------------------------------------------------------------------------

const E1 = matchScalarBar(
  'E1',
  'coopertitionBonus',
  'Coopertition bonus',
  pts(1)
);
const E2 = matchScalarBar(
  'E2',
  'globalZone3Count',
  'Global Zone-3 count',
  countFmt('robots')
);
const E3 = scalarStatTile(
  'E3',
  'coopertitionRate',
  'Coopertition rate',
  ratioPercent()
);
const E4 = scalarStatTile(
  'E4',
  'perfectCoopertitionRate',
  'Perfect coopertition rate',
  ratioPercent()
);
const E5 = scalarStatTile(
  'E5',
  'nearMissRate',
  'Near-miss rate',
  ratioPercent()
);
const E6 = matchScalarBar('E6', 'sharedPoints', 'Shared points', pts(1));
const E7 = matchScalarBar(
  'E7',
  'sharedPointsShare',
  'Shared points share',
  ratioPercent()
);
const E8 = matchScalarBar(
  'E8',
  'independentScore',
  'Independent score',
  pts(1)
);
const E9 = teamScalarBar(
  'E9',
  'teamCooperativeIndex',
  'Team cooperative index',
  pts(2)
);
const E13 = scalarStatTile(
  'E13',
  'eventGlobalAllianceTotal',
  'Event global-alliance total',
  pts(0)
);

/** `teamRowsRecord`: teamKey -> array of per-match booleans. Flattened to one row per team-match observation. */
function coopFlagTable(
  catalogueId: string,
  columnId: string,
  columnLabel: string
): SemanticRegistration {
  const column: SemanticMeasure = {
    id: columnId,
    label: columnLabel,
    format: textFmt
  };
  return {
    seasonKey: SEASON_KEY,
    catalogueId,
    metadata: {
      defaultKind: 'table',
      supportedKinds: ['table'],
      modesByKind: modesFor('table'),
      measures: [column],
      defaultMeasureId: column.id
    },
    manifest: {
      catalogueId,
      fixtureExpectation: 'nonempty',
      assertions: [
        `${catalogueId}: one row per (team, match) observation, identity carries both the team and the match`,
        `${catalogueId}: boolean observations are preserved as booleans, never coerced to 0/1`
      ]
    },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      if (spec.kind !== 'table')
        throw new SemanticPreparationError(
          `${catalogueId}: unsupported presentation kind ${spec.kind}`
        );
      const teams = asTeamRows<
        {
          eventKey: string;
          tournamentKey: string;
          matchId: number;
          value: boolean | null;
        }[]
      >(ok.data, catalogueId);
      const rows = flattenTableRows(teams, {
        parentId: (team) => stableEntityId('team', team.teamKey),
        path: 'entries',
        children: (team) => (Array.isArray(team.value) ? team.value : []),
        row: (entry, team, index) => {
          const teamE = teamEntity(
            team.teamKey,
            ctx,
            spec.options.showTeamNames
          );
          const matchE = matchEntity(entry.tournamentKey, entry.matchId, ctx);
          return {
            id: stableEntityId(
              'team-match',
              team.teamKey,
              entry.tournamentKey,
              entry.matchId
            ),
            label: `${teamE.label} · ${matchE.label}`,
            cells: {
              [columnId]: tableCell(
                entry.value,
                `${catalogueId}[team ${team.teamKey}][${index}].value`
              )
            }
          };
        }
      });
      const data = tableData('table', [column], rows);
      return createSemanticFrame(
        spec,
        ctx,
        ok,
        data,
        rows.length === 0
          ? {
              emptyReason: `${catalogueId}: no team had a recorded coopertition observation this event`
            }
          : {}
      );
    }
  };
}
const E10 = coopFlagTable('E10', 'contributed', 'Coopertition contributed');
const E11 = coopFlagTable('E11', 'denied', 'Coopertition denied');

/** `matchRows(b)`: one boolean observation per match. */
const E12: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'E12',
  metadata: {
    defaultKind: 'table',
    supportedKinds: ['table'],
    modesByKind: modesFor('table'),
    measures: [
      {
        id: 'occurred',
        label: 'Cross-alliance assist occurred',
        format: textFmt
      }
    ],
    defaultMeasureId: 'occurred'
  },
  manifest: {
    catalogueId: 'E12',
    fixtureExpectation: 'nonempty',
    assertions: [
      'E12: one row per tournament-qualified match',
      'E12: the boolean value is preserved verbatim, never coerced to 0/1'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (spec.kind !== 'table')
      throw new SemanticPreparationError(
        `E12: unsupported presentation kind ${spec.kind}`
      );
    const rows = asMatchRows<boolean>(ok.data, 'E12');
    const column: SemanticMeasure = {
      id: 'occurred',
      label: 'Cross-alliance assist occurred',
      format: textFmt
    };
    const tableRows = rows.map((row, i) => {
      const match = matchEntity(row.tournamentKey, row.matchId, ctx);
      return {
        id: match.id,
        label: match.label,
        cells: { occurred: tableCell(row.value, `E12[${i}].value`) }
      };
    });
    const data = tableData('table', [column], tableRows);
    return createSemanticFrame(spec, ctx, ok, data);
  }
};

// ---------------------------------------------------------------------------
// F: scoring breakdown
// ---------------------------------------------------------------------------

const SLICE_FIELDS = [
  { id: 'suppression', label: 'Suppression' },
  { id: 'partner', label: 'Partner' },
  { id: 'extinguisher', label: 'Extinguisher' },
  { id: 'coopertition', label: 'Coopertition' },
  { id: 'fouls', label: 'Fouls' }
] as const;
const F1 = matchObjectGroupedBar('F1', SLICE_FIELDS, pts(1), [
  'F1: five scoring-source slices per match, values preserve real zero and null'
]);
const F2 = matchObjectGroupedBar('F2', SLICE_FIELDS, ratioPercent(), [
  'F2: each slice expressed as a share of that match’s score'
]);
const F3 = matchScalarBar(
  'F3',
  'preMultiplierScore',
  'Pre-multiplier score',
  pts(1)
);
const F4 = matchScalarBar(
  'F4',
  'multiplierAddedPoints',
  'Multiplier-added points',
  pts(1)
);
const F5 = matchObjectTable(
  'F5',
  [
    { id: 'red', label: 'Red alliance score', format: pts(1) },
    { id: 'blue', label: 'Blue alliance score', format: pts(1) },
    {
      id: 'resultChanged',
      label: 'Result changed without climb',
      format: textFmt
    },
    { id: 'penaltiesExcluded', label: 'Penalties excluded', format: textFmt }
  ],
  [
    'F5: counterfactual removing climb credit, one row per match',
    'F5: resultChanged/penaltiesExcluded are booleans, never coerced'
  ]
);
const F6 = matchObjectTable(
  'F6',
  [
    { id: 'red', label: 'Red alliance score', format: pts(1) },
    { id: 'blue', label: 'Blue alliance score', format: pts(1) },
    {
      id: 'resultChanged',
      label: 'Result changed without coopertition',
      format: textFmt
    }
  ],
  ['F6: counterfactual removing coopertition credit, one row per match']
);

const F7: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'F7',
  metadata: {
    defaultKind: 'stat-tile',
    supportedKinds: ['stat-tile'],
    modesByKind: modesFor('stat-tile'),
    measures: [
      { id: 'highest', label: 'Highest alliance score', format: pts(0) },
      { id: 'lowest', label: 'Lowest alliance score', format: pts(0) }
    ],
    defaultMeasureId: 'highest'
  },
  manifest: {
    catalogueId: 'F7',
    fixtureExpectation: 'nonempty',
    assertions: ['F7: highest and lowest alliance score over the whole event']
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (spec.kind !== 'stat-tile')
      throw new SemanticPreparationError(
        `F7: unsupported presentation kind ${spec.kind}`
      );
    const raw = ok.data as { highest: number; lowest: number };
    const data = scalarData([
      {
        measure: {
          id: 'highest',
          label: 'Highest alliance score',
          format: pts(0)
        },
        value: raw.highest
      },
      {
        measure: {
          id: 'lowest',
          label: 'Lowest alliance score',
          format: pts(0)
        },
        value: raw.lowest
      }
    ]);
    return createSemanticFrame(spec, ctx, ok, data);
  }
};

interface RawHistogram {
  bins: number[];
  counts: number[];
  below: number;
  above: number;
}
function histogramBinsFromRaw(
  measure: SemanticMeasure,
  raw: RawHistogram,
  catalogueId: string,
  unit: string
) {
  if (raw.bins.length !== raw.counts.length + 1) {
    throw new SemanticPreparationError(
      `${catalogueId}: bin edges must be exactly one more than bucket counts`
    );
  }
  const bins: {
    id: string;
    label: string;
    lower: number | null;
    upper: number | null;
    value: number | null;
  }[] = [];
  bins.push({
    id: 'below',
    label: `< ${raw.bins[0]} ${unit}`,
    lower: null,
    upper: raw.bins[0],
    value: numericCell(raw.below, `${catalogueId}.below`)
  });
  for (let i = 0; i < raw.counts.length; i++) {
    bins.push({
      id: `bin-${i}`,
      label: `${raw.bins[i]}–${raw.bins[i + 1]} ${unit}`,
      lower: raw.bins[i],
      upper: raw.bins[i + 1],
      value: numericCell(raw.counts[i], `${catalogueId}.counts[${i}]`)
    });
  }
  const last = raw.bins[raw.bins.length - 1];
  bins.push({
    id: 'above',
    label: `> ${last} ${unit}`,
    lower: last,
    upper: null,
    value: numericCell(raw.above, `${catalogueId}.above`)
  });
  return histogramData(measure, bins);
}
function distributionHistogram(
  catalogueId: string,
  assertions: string[]
): SemanticRegistration {
  const measure: SemanticMeasure = {
    id: 'matches',
    label: 'Matches',
    format: countFmt('matches')
  };
  return {
    seasonKey: SEASON_KEY,
    catalogueId,
    metadata: {
      defaultKind: 'histogram',
      supportedKinds: ['histogram'],
      modesByKind: modesFor('histogram'),
      measures: [measure],
      defaultMeasureId: measure.id,
      requiredParams: ['bins']
    },
    manifest: { catalogueId, fixtureExpectation: 'nonempty', assertions },
    adapt(result, spec, ctx) {
      const ok = requireOkResult(result);
      if (spec.kind !== 'histogram')
        throw new SemanticPreparationError(
          `${catalogueId}: unsupported presentation kind ${spec.kind}`
        );
      const raw = ok.data as unknown as RawHistogram;
      const data = histogramBinsFromRaw(measure, raw, catalogueId, 'pts');
      return createSemanticFrame(spec, ctx, ok, data);
    }
  };
}
const F8 = distributionHistogram('F8', [
  'F8: bins are ordered ascending with an unbounded below/above overflow bin at each end',
  'F8: bin boundaries are contiguous — each bucket’s upper bound equals the next bucket’s lower bound'
]);
const F9 = distributionHistogram('F9', [
  'F9: margin-distribution bins share the same boundary/ordering contract as F8'
]);

const F10 = scalarStatTile('F10', 'tieCount', 'Tie count', countFmt('matches'));

const F11: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'F11',
  metadata: {
    defaultKind: 'table',
    supportedKinds: ['table'],
    modesByKind: modesFor('table'),
    measures: [{ id: 'margin', label: 'Margin', format: pts(0) }],
    defaultMeasureId: 'margin'
  },
  manifest: {
    catalogueId: 'F11',
    fixtureExpectation: 'nonempty',
    assertions: [
      'F11: exactly two rows (closest, widest), each identified by its tournament-qualified match'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (spec.kind !== 'table')
      throw new SemanticPreparationError(
        `F11: unsupported presentation kind ${spec.kind}`
      );
    const raw = ok.data as {
      closest: { tournamentKey: string; matchId: number; margin: number };
      widest: { tournamentKey: string; matchId: number; margin: number };
    };
    const column: SemanticMeasure = {
      id: 'margin',
      label: 'Margin',
      format: pts(0)
    };
    const rows = (['closest', 'widest'] as const).map((key) => {
      const entry = raw[key];
      const match = matchEntity(entry.tournamentKey, entry.matchId, ctx);
      return {
        id: stableEntityId(
          'extreme-match',
          key,
          entry.tournamentKey,
          entry.matchId
        ),
        label: `${key === 'closest' ? 'Closest' : 'Widest'} match — ${match.label}`,
        cells: { margin: tableCell(entry.margin) }
      };
    });
    const data = tableData('table', [column], rows);
    return createSemanticFrame(spec, ctx, ok, data);
  }
};

const F12: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'F12',
  metadata: {
    defaultKind: 'line',
    supportedKinds: ['line'],
    modesByKind: modesFor('line'),
    measures: [
      {
        id: 'meanScore',
        label: 'Mean alliance score (trailing window)',
        format: pts(1)
      }
    ],
    defaultMeasureId: 'meanScore'
  },
  manifest: {
    catalogueId: 'F12',
    fixtureExpectation: 'nonempty',
    assertions: [
      'F12: x-coordinate is the source-provided match sequence index — numeric, monotonic, never fabricated',
      'F12: a null trailing-window mean (not yet enough matches) is preserved, never rendered as 0'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (spec.kind !== 'line')
      throw new SemanticPreparationError(
        `F12: unsupported presentation kind ${spec.kind}`
      );
    const rows = asArray<{
      tournamentKey: string;
      matchId: number;
      index: number;
      meanScore: number | null;
    }>(ok.data, 'F12');
    const measure: SemanticMeasure = {
      id: 'meanScore',
      label: 'Mean alliance score (trailing window)',
      format: pts(1)
    };
    const points = rows.map((row, i) => {
      const match = matchEntity(row.tournamentKey, row.matchId, ctx);
      return {
        x: row.index,
        value: numericCell(row.meanScore, `F12[${i}].meanScore`),
        label: match.label
      };
    });
    const data = lineData(
      'number',
      [{ id: 'meanScore', label: measure.label, measure, points }],
      'Match sequence'
    );
    return createSemanticFrame(spec, ctx, ok, data);
  }
};

const F13: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'F13',
  metadata: {
    defaultKind: 'line',
    supportedKinds: ['line'],
    modesByKind: modesFor('line'),
    measures: [{ id: 'score', label: 'Event high score', format: pts(0) }],
    defaultMeasureId: 'score'
  },
  manifest: {
    catalogueId: 'F13',
    fixtureExpectation: 'nonempty',
    assertions: [
      'F13: x-coordinate is the real occurredAt/atUtc timestamp parsed to epoch milliseconds, never a synthetic index'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (spec.kind !== 'line')
      throw new SemanticPreparationError(
        `F13: unsupported presentation kind ${spec.kind}`
      );
    const rows = asArray<{
      tournamentKey: string;
      matchId: number;
      score: number;
      atUtc: string;
    }>(ok.data, 'F13');
    const measure: SemanticMeasure = {
      id: 'score',
      label: 'Event high score',
      format: pts(0)
    };
    const points = rows.map((row, i) => {
      const match = matchEntity(row.tournamentKey, row.matchId, ctx);
      return {
        x: row.atUtc,
        value: numericCell(row.score, `F13[${i}].score`),
        label: match.label
      };
    });
    const data = lineData('timestamp', [
      { id: 'score', label: measure.label, measure, points }
    ]);
    return createSemanticFrame(spec, ctx, ok, data);
  }
};

const F14: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'F14',
  metadata: {
    defaultKind: 'stat-tile',
    supportedKinds: ['stat-tile'],
    modesByKind: modesFor('stat-tile'),
    measures: [
      { id: 'points', label: 'Theoretical max score', format: pts(0) },
      { id: 'penaltiesExcluded', label: 'Penalties excluded', format: textFmt }
    ],
    defaultMeasureId: 'points'
  },
  manifest: {
    catalogueId: 'F14',
    fixtureExpectation: 'nonempty',
    assertions: [
      'F14: the feasibility caveat is carried as a frame note, never folded into or dropped from the numeric value'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (spec.kind !== 'stat-tile')
      throw new SemanticPreparationError(
        `F14: unsupported presentation kind ${spec.kind}`
      );
    const raw = ok.data as {
      points: number;
      penaltiesExcluded: boolean;
      feasibility: string;
    };
    const data = scalarData([
      {
        measure: {
          id: 'points',
          label: 'Theoretical max score',
          format: pts(0)
        },
        value: raw.points
      },
      {
        measure: {
          id: 'penaltiesExcluded',
          label: 'Penalties excluded',
          format: textFmt
        },
        value: raw.penaltiesExcluded
      }
    ]);
    return createSemanticFrame(spec, ctx, ok, data, {
      notes: [raw.feasibility]
    });
  }
};

const F15 = matchScalarBar(
  'F15',
  'ceilingAchieved',
  '% of ceiling achieved',
  ratioPercent()
);
const F16 = matchScalarBar(
  'F16',
  'pointsPerBall',
  'Points per ball',
  numberFormat(2, 'pts/ball')
);
const F17 = matchScalarBar(
  'F17',
  'ceilingRoundingGain',
  'Ceiling rounding gain',
  pts(2)
);

// ---------------------------------------------------------------------------
// G: fouls & cards
// ---------------------------------------------------------------------------

const G1 = matchObjectGroupedBar(
  'G1',
  [
    { id: 'minor', label: 'Minor fouls' },
    { id: 'major', label: 'Major fouls' }
  ],
  countFmt('fouls'),
  ['G1: minor and major foul counts per match, real zero counts are preserved']
);
const G2 = matchScalarBar(
  'G2',
  'foulPointsAwarded',
  'Foul points awarded',
  pts(1)
);
const G3 = matchScalarBar(
  'G3',
  'foulPointsShare',
  'Foul points share',
  ratioPercent()
);

const G4: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'G4',
  metadata: {
    defaultKind: 'table',
    supportedKinds: ['table'],
    modesByKind: modesFor('table'),
    measures: []
  },
  manifest: {
    catalogueId: 'G4',
    fixtureExpectation: 'legitimately-empty',
    emptyReason:
      'No match at this event had its result changed by removing foul-point terms',
    assertions: [
      'G4: an event where fouls never decided a match result yields zero rows, never a fabricated placeholder row'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (spec.kind !== 'table')
      throw new SemanticPreparationError(
        `G4: unsupported presentation kind ${spec.kind}`
      );
    const rows = asArray<{ tournamentKey: string; matchId: number }>(
      ok.data,
      'G4'
    );
    const tableRows = rows.map((row) => {
      const match = matchEntity(row.tournamentKey, row.matchId, ctx);
      return { id: match.id, label: match.label, cells: {} };
    });
    const data = tableData('table', [], tableRows);
    return createSemanticFrame(
      spec,
      ctx,
      ok,
      data,
      tableRows.length === 0
        ? {
            emptyReason:
              'No match at this event had its result changed by removing foul-point terms'
          }
        : {}
    );
  }
};

const G5 = teamScalarBar(
  'G5',
  'foulRate',
  'Foul rate (team)',
  numberFormat(2, 'fouls/match'),
  false
);

const G6: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'G6',
  metadata: {
    defaultKind: 'stat-tile',
    supportedKinds: ['stat-tile'],
    modesByKind: modesFor('stat-tile'),
    measures: [
      { id: 'yellow', label: 'Yellow cards', format: countFmt('cards') },
      { id: 'red', label: 'Red cards', format: countFmt('cards') },
      { id: 'white', label: 'White cards', format: countFmt('cards') }
    ],
    defaultMeasureId: 'yellow'
  },
  manifest: {
    catalogueId: 'G6',
    fixtureExpectation: 'nonempty',
    assertions: [
      'G6: three real card-type counts, preserved even when every count is a real zero'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (spec.kind !== 'stat-tile')
      throw new SemanticPreparationError(
        `G6: unsupported presentation kind ${spec.kind}`
      );
    const raw = ok.data as { yellow: number; red: number; white: number };
    const data = scalarData([
      {
        measure: {
          id: 'yellow',
          label: 'Yellow cards',
          format: countFmt('cards')
        },
        value: raw.yellow
      },
      {
        measure: { id: 'red', label: 'Red cards', format: countFmt('cards') },
        value: raw.red
      },
      {
        measure: {
          id: 'white',
          label: 'White cards',
          format: countFmt('cards')
        },
        value: raw.white
      }
    ]);
    return createSemanticFrame(spec, ctx, ok, data);
  }
};

const G7: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'G7',
  metadata: {
    defaultKind: 'table',
    supportedKinds: ['table'],
    modesByKind: modesFor('table'),
    measures: [
      { id: 'cardStatus', label: 'Card status', format: countFmt() },
      { id: 'cardPhase', label: 'Card phase', format: textFmt }
    ],
    defaultMeasureId: 'cardStatus'
  },
  manifest: {
    catalogueId: 'G7',
    fixtureExpectation: 'legitimately-empty',
    emptyReason: 'No team carried a card at this event',
    assertions: [
      'G7: an event with no cards issued yields zero rows, never a synthetic "no card" row'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (spec.kind !== 'table')
      throw new SemanticPreparationError(
        `G7: unsupported presentation kind ${spec.kind}`
      );
    const rows = asArray<{
      teamKey: number;
      cardStatus: number;
      cardPhase: string | null;
    }>(ok.data, 'G7');
    const columns: SemanticMeasure[] = [
      { id: 'cardStatus', label: 'Card status', format: countFmt() },
      { id: 'cardPhase', label: 'Card phase', format: textFmt }
    ];
    const tableRows = rows.map((row, i) => {
      const team = teamEntity(row.teamKey, ctx, spec.options.showTeamNames);
      return {
        id: stableEntityId('team-card', row.teamKey, i),
        label: team.label,
        cells: {
          cardStatus: tableCell(row.cardStatus),
          cardPhase: tableCell(row.cardPhase)
        }
      };
    });
    const data = tableData('table', columns, tableRows);
    return createSemanticFrame(
      spec,
      ctx,
      ok,
      data,
      tableRows.length === 0
        ? { emptyReason: 'No team carried a card at this event' }
        : {}
    );
  }
};

const G8: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'G8',
  metadata: {
    defaultKind: 'bar',
    supportedKinds: ['bar'],
    modesByKind: modesFor('bar'),
    measures: [
      { id: 'cards', label: 'Cards issued', format: countFmt('cards') }
    ],
    defaultMeasureId: 'cards'
  },
  manifest: {
    catalogueId: 'G8',
    fixtureExpectation: 'nonempty',
    assertions: [
      'G8: one bar per tournament (labelled by tournament type), real zero counts are preserved'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (spec.kind !== 'bar')
      throw new SemanticPreparationError(
        `G8: unsupported presentation kind ${spec.kind}`
      );
    const rows = asArray<{
      tournamentKey: string;
      tournamentType: string;
      cards: number;
    }>(ok.data, 'G8');
    const entities: SemanticEntity[] = rows.map((row) => ({
      id: stableEntityId('tournament', row.tournamentKey),
      label: row.tournamentType
    }));
    const measure: SemanticMeasure = {
      id: 'cards',
      label: 'Cards issued',
      format: countFmt('cards')
    };
    const data = categoricalData('bar', entities, [
      {
        id: 'cards',
        label: 'Cards issued',
        measure,
        points: rows.map((row, i) => ({
          entityId: entities[i].id,
          value: numericCell(row.cards, `G8[${i}].cards`)
        }))
      }
    ]);
    return createSemanticFrame(spec, ctx, ok, data);
  }
};

const G9 = scalarStatTile(
  'G9',
  'whiteCardRate',
  'White card rate',
  ratioPercent()
);

const G10: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'G10',
  metadata: {
    defaultKind: 'table',
    supportedKinds: ['table'],
    modesByKind: modesFor('table'),
    measures: [
      {
        id: 'excludedFromRanking',
        label: 'Excluded from ranking-score mean',
        format: textFmt
      }
    ],
    defaultMeasureId: 'excludedFromRanking'
  },
  manifest: {
    catalogueId: 'G10',
    fixtureExpectation: 'legitimately-empty',
    emptyReason:
      'No red card excluded a team’s score from the ranking-score mean at this event',
    assertions: [
      'G10: an event with no red cards yields zero rows, never a fabricated non-exclusion row'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (spec.kind !== 'table')
      throw new SemanticPreparationError(
        `G10: unsupported presentation kind ${spec.kind}`
      );
    const rows = asArray<{
      teamKey: number;
      tournamentKey: string;
      matchId: number;
      excludedFromRanking: boolean;
    }>(ok.data, 'G10');
    const column: SemanticMeasure = {
      id: 'excludedFromRanking',
      label: 'Excluded from ranking-score mean',
      format: textFmt
    };
    const tableRows = rows.map((row) => {
      const team = teamEntity(row.teamKey, ctx, spec.options.showTeamNames);
      const match = matchEntity(row.tournamentKey, row.matchId, ctx);
      return {
        id: stableEntityId(
          'red-card-exclusion',
          row.tournamentKey,
          row.matchId,
          row.teamKey
        ),
        label: `${team.label} · ${match.label}`,
        cells: { excludedFromRanking: tableCell(row.excludedFromRanking) }
      };
    });
    const data = tableData('table', [column], tableRows);
    return createSemanticFrame(
      spec,
      ctx,
      ok,
      data,
      tableRows.length === 0
        ? {
            emptyReason:
              'No red card excluded a team’s score from the ranking-score mean at this event'
          }
        : {}
    );
  }
};

const G11 = scalarStatTile('G11', 'dqCount', 'DQ count', countFmt('teams'));
const G12 = scalarStatTile(
  'G12',
  'noShowCount',
  'No-show count',
  countFmt('teams')
);

const G13: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'G13',
  metadata: {
    defaultKind: 'table',
    supportedKinds: ['table'],
    modesByKind: modesFor('table'),
    measures: [
      { id: 'fieldPath', label: 'Card field path', format: textFmt },
      {
        id: 'seconds',
        label: 'Seconds after actual start',
        format: secondsFmt(1)
      }
    ],
    defaultMeasureId: 'seconds'
  },
  manifest: {
    catalogueId: 'G13',
    fixtureExpectation: 'legitimately-empty',
    emptyReason:
      'No card was issued at this event, so there are no card-issue timing observations',
    assertions: [
      'G13: an event with no card entries yields zero timing rows, never a fabricated 0s entry'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (spec.kind !== 'table')
      throw new SemanticPreparationError(
        `G13: unsupported presentation kind ${spec.kind}`
      );
    const matches = asMatchRows<
      { fieldPath: string | null; seconds: number | null }[]
    >(ok.data, 'G13');
    const rows = flattenTableRows(matches, {
      parentId: (match) =>
        stableEntityId('match', match.tournamentKey, match.matchId),
      path: 'cards',
      children: (match) => (Array.isArray(match.value) ? match.value : []),
      row: (card, match) => {
        const m = matchEntity(match.tournamentKey, match.matchId, ctx);
        return {
          label: m.label,
          cells: {
            fieldPath: tableCell(card.fieldPath),
            seconds: tableCell(card.seconds)
          }
        };
      }
    });
    const columns: SemanticMeasure[] = [
      { id: 'fieldPath', label: 'Card field path', format: textFmt },
      {
        id: 'seconds',
        label: 'Seconds after actual start',
        format: secondsFmt(1)
      }
    ];
    const data = tableData('table', columns, rows);
    return createSemanticFrame(
      spec,
      ctx,
      ok,
      data,
      rows.length === 0
        ? {
            emptyReason:
              'No card was issued at this event, so there are no card-issue timing observations'
          }
        : {}
    );
  }
};

const G14 = matchScalarBar(
  'G14',
  'foulCorrections',
  'Foul corrections',
  countFmt('corrections')
);

// ---------------------------------------------------------------------------
// H: live / real-time
// ---------------------------------------------------------------------------

const H1 = matchScalarBar(
  'H1',
  'liveScoreVelocity',
  'Live score velocity',
  numberFormat(2, 'pts/s'),
  { requiredParams: ['windowSeconds'] }
);

const H2 = matchObjectTable(
  'H2',
  [
    { id: 'projected', label: 'Projected final score', format: pts(0) },
    { id: 'expectedEndgame', label: 'Expected endgame points', format: pts(0) }
  ],
  [
    'H2: a match with an insufficient trailing scoring window is a null row, never a fabricated projection',
    'H2: row identity is the tournament-qualified match'
  ]
);

const H3 = matchScalarBar(
  'H3',
  'liveWinProbability',
  'Live win probability',
  ratioPercent()
);
const H4 = matchScalarBar(
  'H4',
  'timeSinceLastScore',
  'Time since last score',
  msFmt()
);

const H5 = matchObjectTable(
  'H5',
  [
    { id: 'alliance', label: 'Alliance', format: textFmt },
    {
      id: 'entries',
      label: 'Scoring entries in run',
      format: countFmt('entries')
    }
  ],
  [
    'H5: one row per match, identifying which alliance owned the consecutive-scoring run'
  ]
);

/**
 * H6: the defect fix. The legacy adapter rendered a category-axis label
 * (`Match 1 @ 30s`) where a numeric, chronological time axis belongs. Here
 * the x-coordinate is the raw `fromSeconds` boundary of each 30s segment
 * (numeric, strictly increasing within a match); `point.label` carries the
 * human "0-30s" string separately, and each match is its own line series,
 * identified by tournament-qualified match identity, not by a shared label.
 */
const H6: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'H6',
  metadata: {
    defaultKind: 'line',
    supportedKinds: ['line'],
    modesByKind: modesFor('line'),
    measures: [
      {
        id: 'balls',
        label: 'Net balls scored',
        format: numberFormat(0, 'balls')
      }
    ],
    defaultMeasureId: 'balls'
  },
  manifest: {
    catalogueId: 'H6',
    fixtureExpectation: 'nonempty',
    assertions: [
      'H6: x-coordinates are the numeric elapsed-seconds boundary of each 30s segment, never a formatted string',
      'H6: points within one match are chronologically ordered by fromSeconds',
      'H6: curves are grouped by tournament-qualified match identity, not by a shared display label',
      'H6: negative net-ball segments (net removal) are preserved, never clamped or coerced'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (spec.kind !== 'line')
      throw new SemanticPreparationError(
        `H6: unsupported presentation kind ${spec.kind}`
      );
    const rows = asMatchRows<
      { fromSeconds: number; toSeconds: number; balls: number }[]
    >(ok.data, 'H6');
    const measure: SemanticMeasure = {
      id: 'balls',
      label: 'Net balls scored',
      format: numberFormat(0, 'balls')
    };
    const series = rows.map((row, ri) => {
      const match = matchEntity(row.tournamentKey, row.matchId, ctx);
      const segments = Array.isArray(row.value) ? row.value : [];
      return {
        id: match.id,
        label: match.label,
        measure,
        points: segments.map((segment, si) => ({
          x: segment.fromSeconds,
          value: numericCell(segment.balls, `H6[${ri}].value[${si}].balls`),
          label: `${segment.fromSeconds}–${segment.toSeconds}s`
        }))
      };
    });
    const data = lineData('number', series, 'Seconds elapsed in match');
    return createSemanticFrame(spec, ctx, ok, data);
  }
};

const H7 = matchScalarBar(
  'H7',
  'ballsNeededForLead',
  'Balls needed to take the lead',
  countFmt('balls')
);
const H8 = matchScalarBar(
  'H8',
  'ballsNeededForRecord',
  'Balls needed for a record',
  countFmt('balls')
);
const H9 = matchScalarBar(
  'H9',
  'robotsNeededForCoopertition',
  'Robots needed for coopertition',
  countFmt('robots')
);
const H10 = matchScalarBar(
  'H10',
  'coopertitionValueAtStake',
  'Coopertition value at stake',
  pts(0)
);

const H11: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'H11',
  metadata: {
    defaultKind: 'table',
    supportedKinds: ['table'],
    modesByKind: modesFor('table'),
    measures: [
      {
        id: 'balls',
        label: 'Balls needed to raise ranking score',
        format: countFmt('balls')
      }
    ],
    defaultMeasureId: 'balls',
    higherIsBetter: false
  },
  manifest: {
    catalogueId: 'H11',
    fixtureExpectation: 'nonempty',
    assertions: [
      'H11: row identity is the (match, team) pair, never row position',
      'H11: a null balls-needed observation (team cannot raise RS via balls) is preserved, never coerced to 0'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (spec.kind !== 'table')
      throw new SemanticPreparationError(
        `H11: unsupported presentation kind ${spec.kind}`
      );
    const matches = asMatchRows<{ teamKey: number; balls: number | null }[]>(
      ok.data,
      'H11'
    );
    const column: SemanticMeasure = {
      id: 'balls',
      label: 'Balls needed',
      format: countFmt('balls')
    };
    const rows = flattenTableRows(matches, {
      parentId: (match) =>
        stableEntityId('match', match.tournamentKey, match.matchId),
      path: 'teams',
      children: (match) => (Array.isArray(match.value) ? match.value : []),
      row: (team, match) => {
        const teamE = teamEntity(team.teamKey, ctx, spec.options.showTeamNames);
        const matchE = matchEntity(match.tournamentKey, match.matchId, ctx);
        return {
          id: stableEntityId(
            'match-team',
            match.tournamentKey,
            match.matchId,
            team.teamKey
          ),
          label: `${matchE.label} · ${teamE.label}`,
          cells: { balls: tableCell(team.balls) }
        };
      }
    });
    const data = tableData('table', [column], rows);
    return createSemanticFrame(spec, ctx, ok, data);
  }
};

/**
 * H12: the second defect fix. The legacy adapter derived row identity from
 * `climbPoints` (a value, not an identity) and implied rank from array
 * order. Here identity is the tournament-qualified team
 * (`stableEntityId('team-ranking', tournamentKey, teamKey)`), and `rank` is
 * carried verbatim from the source row into the table's authoritative
 * `rank` field — `tableData`'s ranking-table validation refuses a row
 * without one, so it can never silently fall back to array position.
 */
const H12: SemanticRegistration = {
  seasonKey: SEASON_KEY,
  catalogueId: 'H12',
  metadata: {
    defaultKind: 'ranking-table',
    supportedKinds: ['ranking-table'],
    modesByKind: modesFor('ranking-table'),
    measures: [
      {
        id: 'rankingScore',
        label: 'Ranking score',
        format: numberFormat(2, 'RS')
      },
      { id: 'wins', label: 'Wins', format: countFmt() },
      { id: 'losses', label: 'Losses', format: countFmt() },
      { id: 'ties', label: 'Ties', format: countFmt() },
      { id: 'played', label: 'Played', format: countFmt() },
      { id: 'rankChange', label: 'Rank change', format: numberFormat(0) },
      { id: 'climbPoints', label: 'Climb points', format: pts(2) },
      { id: 'highestScore', label: 'Highest score', format: pts(0) }
    ],
    defaultMeasureId: 'rankingScore',
    higherIsBetter: true
  },
  manifest: {
    catalogueId: 'H12',
    fixtureExpectation: 'nonempty',
    assertions: [
      'H12: row identity is the tournament-qualified team, never derived from climbPoints or any other measured value',
      'H12: rank is taken verbatim from the source ranking row, never recomputed from array position',
      'H12: rows may arrive in any order; the authoritative rank field is what orders the table, not array index'
    ]
  },
  adapt(result, spec, ctx) {
    const ok = requireOkResult(result);
    if (spec.kind !== 'ranking-table')
      throw new SemanticPreparationError(
        `H12: unsupported presentation kind ${spec.kind}`
      );
    const rows = asArray<{
      eventKey: string;
      tournamentKey: string;
      teamKey: number;
      climbPoints: number;
      losses: number;
      played: number;
      rank: number;
      rankChange: number;
      rankingScore: number;
      ties: number;
      wins: number;
      highestScore: number;
    }>(ok.data, 'H12');
    const columns: SemanticMeasure[] = [
      {
        id: 'rankingScore',
        label: 'Ranking score',
        format: numberFormat(2, 'RS')
      },
      { id: 'wins', label: 'Wins', format: countFmt() },
      { id: 'losses', label: 'Losses', format: countFmt() },
      { id: 'ties', label: 'Ties', format: countFmt() },
      { id: 'played', label: 'Played', format: countFmt() },
      { id: 'rankChange', label: 'Rank change', format: numberFormat(0) },
      { id: 'climbPoints', label: 'Climb points', format: pts(2) },
      { id: 'highestScore', label: 'Highest score', format: pts(0) }
    ];
    const tableRows = rows.map((row) => {
      const team = teamEntity(row.teamKey, ctx, spec.options.showTeamNames);
      return {
        id: stableEntityId('team-ranking', row.tournamentKey, row.teamKey),
        label: team.label,
        rank: row.rank,
        cells: {
          rankingScore: tableCell(row.rankingScore),
          wins: tableCell(row.wins),
          losses: tableCell(row.losses),
          ties: tableCell(row.ties),
          played: tableCell(row.played),
          rankChange: tableCell(row.rankChange),
          climbPoints: tableCell(row.climbPoints),
          highestScore: tableCell(row.highestScore)
        }
      };
    });
    const data = tableData('ranking-table', columns, tableRows);
    return createSemanticFrame(spec, ctx, ok, data);
  }
};

const H13 = matchScalarBar(
  'H13',
  'climbDecisionValue',
  'Climb decision value',
  pts(2)
);

const H14 = matchObjectTable(
  'H14',
  [
    { id: 'worst', label: 'Worst-case projected score', format: pts(0) },
    { id: 'best', label: 'Best-case projected score', format: pts(0) },
    {
      id: 'suppressionFrozen',
      label: 'Suppression frozen at T-30',
      format: numberFormat(0, 'balls')
    }
  ],
  [
    'H14: worst/best-case final score projections alongside the frozen ball count they were computed from, one row per match'
  ]
);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

const FGC2026_E_H_REGISTRATIONS: readonly SemanticRegistration[] = [
  E1,
  E2,
  E3,
  E4,
  E5,
  E6,
  E7,
  E8,
  E9,
  E10,
  E11,
  E12,
  E13,
  F1,
  F2,
  F3,
  F4,
  F5,
  F6,
  F7,
  F8,
  F9,
  F10,
  F11,
  F12,
  F13,
  F14,
  F15,
  F16,
  F17,
  G1,
  G2,
  G3,
  G4,
  G5,
  G6,
  G7,
  G8,
  G9,
  G10,
  G11,
  G12,
  G13,
  G14,
  H1,
  H2,
  H3,
  H4,
  H5,
  H6,
  H7,
  H8,
  H9,
  H10,
  H11,
  H12,
  H13,
  H14
];

/** Season + catalogue-id keyed map, keyed via `semanticRegistrationKey` for direct lookup by an integrating registry. */
export const FGC2026_E_H_SEMANTIC_REGISTRATIONS: ReadonlyMap<
  string,
  SemanticRegistration
> = new Map(
  FGC2026_E_H_REGISTRATIONS.map((registration) => [
    semanticRegistrationKey(registration.seasonKey, registration.catalogueId),
    registration
  ])
);
