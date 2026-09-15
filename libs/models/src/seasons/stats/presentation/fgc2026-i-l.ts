/**
 * FGC2026 semantic presentation registrations for catalogue ids I1-I10,
 * J1-J15, K1-K13, L1-L14 (52 ids total).
 *
 * Each registration turns a real, typed `StatResult` (see
 * `../result-schemas.ts` for the exact shape per id, and
 * `../tests/golden.json` for ground truth) into a v2 `PresentationFrame`
 * built exclusively from `./semantic-helpers.ts` primitives. No heuristic
 * object-scanning, no silent coercion, no `?? 0` / `|| 0` on a data value.
 *
 * Four known defects this file fixes relative to the generic legacy
 * adapter (`./adapters.ts`):
 *   - J1: preserves the real `country` / `countryCode` strings (both a
 *     team -> country table AND a country-level aggregation).
 *   - J2: preserves the `robotName` text instead of dropping it for not
 *     being chartable.
 *   - J4: identity is the team; `rank` is taken verbatim from the source
 *     ranking row, never derived from array position.
 *   - L11: the nested `teams[].rank` is authoritative and is carried
 *     through unchanged; rows are never renumbered by array position.
 */
import { countries as countryReferenceData } from '../fgc2026/countries.js';
import {
  SUPPORTED_GRAPHIC_MODES,
  type GraphicKind,
  type GraphicSpec,
  type MeasureFormat,
  type PresentationFrame,
  type PresentationMode
} from '../../../base/Graphics.js';
import type { StatResult } from '../types.js';
import type { AdaptContext } from './adapt-context.js';
import {
  SemanticPreparationError,
  arrayElementId,
  categoricalData,
  createSemanticFrame,
  flattenTableRows,
  matchEntity,
  numberFormat,
  numericCell,
  percentFormat,
  requireOkResult,
  scalarData,
  semanticRegistrationKey,
  stableEntityId,
  tableCell,
  tableData,
  teamEntity,
  textCell,
  type SemanticCell,
  type SemanticEntity,
  type SemanticManifest,
  type SemanticMeasure,
  type SemanticMetadata,
  type SemanticRegistration,
  type SemanticTableRow
} from './semantic-helpers.js';

const SEASON_KEY = 'fgc_2026';
type OkResult = Extract<StatResult, { status: 'ok' }>;

// ---------------------------------------------------------------------------
// Country metadata contract (for the map renderer and for J1/J6/J15 lookups)
// ---------------------------------------------------------------------------

/** ISO-3166 alpha-2 code + display name, sourced from `../fgc2026/countries.ts`. */
export interface FGC2026CountryMetadata {
  code: string;
  name: string;
}
export const FGC2026_COUNTRY_METADATA: readonly FGC2026CountryMetadata[] =
  countryReferenceData.map((entry) => ({ code: entry.code, name: entry.name }));

const countryMetadataByCode = new Map(
  FGC2026_COUNTRY_METADATA.map((entry) => [entry.code, entry])
);
const countryMetadataByName = new Map(
  FGC2026_COUNTRY_METADATA.map((entry) => [entry.name.toLowerCase(), entry])
);

/** Resolves a source `{country, countryCode}` pair to a validated alpha-2 code + display name, or `null` when unmappable. */
export function resolveFgc2026Country(
  country: string | null,
  countryCode: string | null
): FGC2026CountryMetadata | null {
  if (countryCode && /^[A-Z]{2}$/.test(countryCode)) {
    const byCode = countryMetadataByCode.get(countryCode);
    if (byCode) return byCode;
  }
  if (country) {
    const byName = countryMetadataByName.get(country.toLowerCase());
    if (byName) return byName;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Small local helpers (private to this file; do not export beyond this module
// except where explicitly needed for tests/registration lookup)
// ---------------------------------------------------------------------------

function prop(row: unknown, key: string): unknown {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new SemanticPreparationError(
      `Expected an object row while reading "${key}"`
    );
  }
  return (row as Record<string, unknown>)[key];
}
/** Identity fields (teamKey, tournamentKey, matchId, allianceSeed, ...) are never null/absent. */
function requireNumber(row: unknown, key: string): number {
  const value = numericCell(prop(row, key), key);
  if (value === null)
    throw new SemanticPreparationError(
      `"${key}" is required and cannot be null`
    );
  return value;
}
function requireString(row: unknown, key: string): string {
  const value = textCell(prop(row, key), key);
  if (value === null)
    throw new SemanticPreparationError(
      `"${key}" is required and cannot be null`
    );
  return value;
}
function requireBoolean(row: unknown, key: string): boolean {
  const value = prop(row, key);
  if (typeof value !== 'boolean')
    throw new SemanticPreparationError(`"${key}" must be a boolean`);
  return value;
}
function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value))
    throw new SemanticPreparationError(`${path}: expected an array`);
  return value;
}
function allianceEntity(
  tournamentKey: string,
  allianceSeed: number
): SemanticEntity {
  return {
    id: stableEntityId('alliance', tournamentKey, allianceSeed),
    label: `Seed ${allianceSeed} · ${tournamentKey}`
  };
}
function fieldEntity(fieldNumber: number): SemanticEntity {
  return {
    id: stableEntityId('field', fieldNumber),
    label: `Field ${fieldNumber}`
  };
}
function measure(
  id: string,
  label: string,
  format: MeasureFormat
): SemanticMeasure {
  return { id, label, format };
}
function modesFor(
  kinds: readonly GraphicKind[]
): Partial<Record<GraphicKind, readonly PresentationMode[]>> {
  const out: Partial<Record<GraphicKind, readonly PresentationMode[]>> = {};
  for (const kind of kinds) out[kind] = SUPPORTED_GRAPHIC_MODES[kind];
  return out;
}
function metadataFor(options: {
  defaultKind: GraphicKind;
  supportedKinds: readonly GraphicKind[];
  measures: readonly SemanticMeasure[];
  defaultMeasureId?: string;
  higherIsBetter?: boolean;
  requiredParams?: readonly string[];
}): SemanticMetadata {
  return {
    defaultKind: options.defaultKind,
    supportedKinds: options.supportedKinds,
    modesByKind: modesFor(options.supportedKinds),
    measures: options.measures,
    ...(options.defaultMeasureId !== undefined
      ? { defaultMeasureId: options.defaultMeasureId }
      : {}),
    ...(options.higherIsBetter !== undefined
      ? { higherIsBetter: options.higherIsBetter }
      : {}),
    ...(options.requiredParams !== undefined
      ? { requiredParams: options.requiredParams }
      : {})
  };
}
function register(
  catalogueId: string,
  metadata: SemanticMetadata,
  manifest: {
    fixtureExpectation: SemanticManifest['fixtureExpectation'];
    assertions: readonly string[];
    emptyReason?: string;
  },
  adapt: (
    result: StatResult,
    spec: GraphicSpec,
    ctx: AdaptContext
  ) => PresentationFrame
): SemanticRegistration {
  return {
    seasonKey: SEASON_KEY,
    catalogueId,
    metadata,
    manifest: {
      catalogueId,
      fixtureExpectation: manifest.fixtureExpectation,
      assertions: [...manifest.assertions],
      ...(manifest.emptyReason !== undefined
        ? { emptyReason: manifest.emptyReason }
        : {})
    },
    adapt
  };
}

// ---------------------------------------------------------------------------
// Generic row extraction shared across many ids: matchRows(n), teamRows(n),
// allianceRows(n) all wrap a single (possibly null) numeric value.
// ---------------------------------------------------------------------------

interface MatchValue {
  tournamentKey: string;
  matchId: number;
  value: number | null;
}
function extractMatchValues(raw: unknown, field: string): MatchValue[] {
  return asArray(raw, 'matchRows').map((row) => ({
    tournamentKey: requireString(row, 'tournamentKey'),
    matchId: requireNumber(row, 'matchId'),
    value: numericCell(prop(row, field), field)
  }));
}
interface TeamValue {
  teamKey: number;
  value: number | null;
}
function extractTeamValues(raw: unknown, field: string): TeamValue[] {
  return asArray(raw, 'teamRows').map((row) => ({
    teamKey: requireNumber(row, 'teamKey'),
    value: numericCell(prop(row, field), field)
  }));
}
interface AllianceValue {
  tournamentKey: string;
  allianceSeed: number;
  value: number | null;
}
function extractAllianceValues(raw: unknown, field: string): AllianceValue[] {
  return asArray(raw, 'allianceRows').map((row) => ({
    tournamentKey: requireString(row, 'tournamentKey'),
    allianceSeed: requireNumber(row, 'allianceSeed'),
    value: numericCell(prop(row, field), field)
  }));
}
interface AllianceRaw {
  tournamentKey: string;
  allianceSeed: number;
  value: unknown;
}
function extractAllianceRows(raw: unknown): AllianceRaw[] {
  return asArray(raw, 'allianceRows').map((row) => ({
    tournamentKey: requireString(row, 'tournamentKey'),
    allianceSeed: requireNumber(row, 'allianceSeed'),
    value: prop(row, 'value')
  }));
}

/** bar (categorical) or table rendering of a shared-domain (entity, value) list; `field '<measure.id>'` is the sole series/column. */
function numberFrame(
  spec: GraphicSpec,
  ctx: AdaptContext,
  ok: OkResult,
  entities: SemanticEntity[],
  values: (number | null)[],
  m: SemanticMeasure,
  emptyMessage: string
): PresentationFrame {
  if (spec.kind === 'bar' || spec.kind === 'grouped-bar') {
    const data = categoricalData(spec.kind, entities, [
      {
        id: m.id,
        label: m.label,
        measure: m,
        points: entities.map((entity, i) => ({
          entityId: entity.id,
          value: values[i]
        }))
      }
    ]);
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason: entities.length === 0 ? emptyMessage : undefined
    });
  }
  if (spec.kind === 'table') {
    const rows: SemanticTableRow[] = entities.map((entity, i) => ({
      id: entity.id,
      label: entity.label,
      cells: { [m.id]: values[i] }
    }));
    const data = tableData('table', [m], rows);
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason: rows.length === 0 ? emptyMessage : undefined
    });
  }
  throw new SemanticPreparationError(
    `Unsupported presentation kind "${spec.kind}" for this catalogue id`
  );
}
function matchNumberFrame(
  spec: GraphicSpec,
  ctx: AdaptContext,
  ok: OkResult,
  entries: MatchValue[],
  m: SemanticMeasure
): PresentationFrame {
  const entities = entries.map((e) =>
    matchEntity(e.tournamentKey, e.matchId, ctx)
  );
  return numberFrame(
    spec,
    ctx,
    ok,
    entities,
    entries.map((e) => e.value),
    m,
    'No matches recorded in this fixture'
  );
}
function teamNumberFrame(
  spec: GraphicSpec,
  ctx: AdaptContext,
  ok: OkResult,
  entries: TeamValue[],
  m: SemanticMeasure
): PresentationFrame {
  const entities = entries.map((e) => teamEntity(e.teamKey, ctx));
  return numberFrame(
    spec,
    ctx,
    ok,
    entities,
    entries.map((e) => e.value),
    m,
    'No teams recorded in this fixture'
  );
}
function allianceNumberFrame(
  spec: GraphicSpec,
  ctx: AdaptContext,
  ok: OkResult,
  entries: AllianceValue[],
  m: SemanticMeasure
): PresentationFrame {
  const entities = entries.map((e) =>
    allianceEntity(e.tournamentKey, e.allianceSeed)
  );
  return numberFrame(
    spec,
    ctx,
    ok,
    entities,
    entries.map((e) => e.value),
    m,
    'No alliances recorded in this fixture'
  );
}

// ---------------------------------------------------------------------------
// Shared measures
// ---------------------------------------------------------------------------

const secondsMeasure = (id: string, label: string) =>
  measure(id, label, numberFormat(0, 's'));
const pointsMeasure = (id: string, label: string, precision = 0) =>
  measure(id, label, numberFormat(precision, 'pts'));
const countMeasure = (id: string, label: string) =>
  measure(id, label, numberFormat(0));
const textMeasure = (id: string, label: string) =>
  measure(id, label, { style: 'text', scale: 1 } as MeasureFormat);
const booleanMeasure = (id: string, label: string) =>
  measure(id, label, { style: 'text', scale: 1 } as MeasureFormat);

// ---------------------------------------------------------------------------
// I1-I10 — EMS scoring/schedule operations
// ---------------------------------------------------------------------------

const I_MATCH_NUMBER_IDS: {
  id: string;
  name: string;
  unit: string;
  higherIsBetter?: boolean;
  precision?: number;
}[] = [
  { id: 'I1', name: 'Cycle time', unit: 's' },
  { id: 'I3', name: 'Schedule adherence', unit: 's', higherIsBetter: false },
  { id: 'I4', name: 'Cumulative drift', unit: 's', higherIsBetter: false },
  { id: 'I5', name: 'Prestart-to-start', unit: 's', higherIsBetter: false },
  { id: 'I6', name: 'Field turnaround', unit: 's', higherIsBetter: false },
  { id: 'I9', name: 'Results commit latency', unit: 's', higherIsBetter: false }
];

const iMatchNumberRegistrations = I_MATCH_NUMBER_IDS.map(
  ({ id, name, unit, higherIsBetter }) => {
    const m = measure('value', name, numberFormat(0, unit));
    return register(
      id,
      metadataFor({
        defaultKind: 'bar',
        supportedKinds: ['bar', 'table'],
        measures: [m],
        defaultMeasureId: 'value',
        higherIsBetter
      }),
      {
        fixtureExpectation: 'nonempty',
        assertions: [
          'every match keeps its tournament-qualified identity (tournamentKey + matchId), never a fabricated running index',
          'a null observation renders as a gap, never a fabricated zero'
        ]
      },
      (result, spec, ctx) => {
        const ok = requireOkResult(result);
        const entries = extractMatchValues(ok.data, 'value');
        return matchNumberFrame(spec, ctx, ok, entries, m);
      }
    );
  }
);

const i2Measure = measure(
  'value',
  'Rolling avg cycle time',
  numberFormat(0, 's')
);
const i2 = register(
  'I2',
  metadataFor({
    defaultKind: 'stat-tile',
    supportedKinds: ['stat-tile'],
    measures: [i2Measure],
    defaultMeasureId: 'value'
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'a single scalar mean over the trailing window is preserved as a real number, not fabricated'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const value = numericCell(ok.data, 'value');
    return createSemanticFrame(
      spec,
      ctx,
      ok,
      scalarData([{ measure: i2Measure, value }])
    );
  }
);

const i7PlayedMeasure = countMeasure('played', 'Matches played');
const i7RemainingMeasure = countMeasure('remaining', 'Matches remaining');
const i7 = register(
  'I7',
  metadataFor({
    defaultKind: 'stat-tile',
    supportedKinds: ['stat-tile'],
    measures: [i7PlayedMeasure, i7RemainingMeasure]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'both played and remaining counts are preserved as real integers, including a legitimate 0'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const played = requireNumber(ok.data, 'played');
    const remaining = requireNumber(ok.data, 'remaining');
    return createSemanticFrame(
      spec,
      ctx,
      ok,
      scalarData([
        { measure: i7PlayedMeasure, value: played },
        { measure: i7RemainingMeasure, value: remaining }
      ])
    );
  }
);

const i8MeanScoreMeasure = pointsMeasure('meanScore', 'Mean score', 1);
const i8MatchesMeasure = countMeasure('matches', 'Matches');
const i8 = register(
  'I8',
  metadataFor({
    defaultKind: 'bar',
    supportedKinds: ['bar', 'table'],
    measures: [i8MeanScoreMeasure, i8MatchesMeasure],
    defaultMeasureId: 'meanScore'
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'each field keeps its own stable identity; a field with no matches shows a null mean, not a fabricated zero'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const entries = asArray(ok.data, 'I8').map((row) => ({
      fieldNumber: requireNumber(row, 'fieldNumber'),
      meanScore: numericCell(prop(row, 'meanScore'), 'meanScore'),
      matches: requireNumber(row, 'matches')
    }));
    const entities = entries.map((e) => fieldEntity(e.fieldNumber));
    if (spec.kind === 'bar') {
      const data = categoricalData('bar', entities, [
        {
          id: 'meanScore',
          label: i8MeanScoreMeasure.label,
          measure: i8MeanScoreMeasure,
          points: entities.map((entity, i) => ({
            entityId: entity.id,
            value: entries[i].meanScore
          }))
        }
      ]);
      return createSemanticFrame(spec, ctx, ok, data, {
        emptyReason:
          entities.length === 0
            ? 'No fields recorded in this fixture'
            : undefined
      });
    }
    if (spec.kind === 'table') {
      const rows: SemanticTableRow[] = entities.map((entity, i) => ({
        id: entity.id,
        label: entity.label,
        cells: { meanScore: entries[i].meanScore, matches: entries[i].matches }
      }));
      const data = tableData(
        'table',
        [i8MeanScoreMeasure, i8MatchesMeasure],
        rows
      );
      return createSemanticFrame(spec, ctx, ok, data, {
        emptyReason:
          rows.length === 0 ? 'No fields recorded in this fixture' : undefined
      });
    }
    throw new SemanticPreparationError(`I8: unsupported kind ${spec.kind}`);
  }
);

const i10Measure = measure(
  'value',
  'Event ball throughput',
  numberFormat(2, 'balls/hr')
);
const i10 = register(
  'I10',
  metadataFor({
    defaultKind: 'stat-tile',
    supportedKinds: ['stat-tile'],
    measures: [i10Measure],
    defaultMeasureId: 'value'
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'the event-wide throughput scalar is preserved with full precision'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const value = numericCell(ok.data, 'value');
    return createSemanticFrame(
      spec,
      ctx,
      ok,
      scalarData([{ measure: i10Measure, value }])
    );
  }
);

// ---------------------------------------------------------------------------
// J1-J15 — EMS/DER team & geographic facts
// ---------------------------------------------------------------------------

const j1CountryMeasure = countMeasure('teamCount', 'Teams');
const j1 = register(
  'J1',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table', 'geo-map'],
    measures: [j1CountryMeasure]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'the real country name and ISO country code are preserved per team, never dropped for being non-numeric',
      'a country-level aggregation (geo-map) is provided in addition to, not instead of, the team-level table',
      'unmappable codes are reported in unknownCountryCodes rather than silently dropped'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const rows = asArray(ok.data, 'J1').map((row) => ({
      teamKey: requireNumber(row, 'teamKey'),
      country: textCell(prop(row, 'country'), 'country'),
      countryCode: textCell(prop(row, 'countryCode'), 'countryCode')
    }));
    if (spec.kind === 'table') {
      const tableRows: SemanticTableRow[] = rows.map((row) => {
        const entity = teamEntity(row.teamKey, ctx);
        return {
          id: entity.id,
          label: entity.label,
          cells: { country: row.country, countryCode: row.countryCode }
        };
      });
      const data = tableData(
        'table',
        [
          textMeasure('country', 'Country'),
          textMeasure('countryCode', 'Country code')
        ],
        tableRows
      );
      return createSemanticFrame(spec, ctx, ok, data, {
        emptyReason:
          tableRows.length === 0 ? 'No teams in this fixture' : undefined
      });
    }
    if (spec.kind === 'geo-map') {
      const counts = new Map<string, { label: string; value: number }>();
      const unknownCountryCodes: string[] = [];
      let unrecorded = 0;
      for (const row of rows) {
        const resolved = resolveFgc2026Country(row.country, row.countryCode);
        if (resolved) {
          const existing = counts.get(resolved.code) ?? {
            label: resolved.name,
            value: 0
          };
          existing.value += 1;
          counts.set(resolved.code, existing);
        } else if (row.country || row.countryCode) {
          unknownCountryCodes.push(row.countryCode ?? row.country ?? 'unknown');
        } else {
          unrecorded += 1;
        }
      }
      const countryList = [...counts.entries()].map(([countryCode, entry]) => ({
        countryCode,
        label: entry.label,
        value: entry.value
      }));
      const data = {
        kind: 'geo-map' as const,
        geography: 'country' as const,
        measure: j1CountryMeasure,
        countries: countryList,
        unknownCountryCodes
      };
      const notes =
        unrecorded > 0
          ? [
              `${unrecorded} team(s) have no recorded country (null observation, not a zero-count country)`
            ]
          : [];
      return createSemanticFrame(spec, ctx, ok, data, {
        notes,
        emptyReason:
          countryList.length === 0
            ? 'No team in this fixture has a resolvable country'
            : undefined
      });
    }
    throw new SemanticPreparationError(`J1: unsupported kind ${spec.kind}`);
  }
);

const j2RobotNameMeasure = textMeasure('robotName', 'Robot name');
const j2 = register(
  'J2',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [j2RobotNameMeasure]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'the robot name text is preserved verbatim per team; a null name is a null cell, never dropped for being non-numeric'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const rows: SemanticTableRow[] = asArray(ok.data, 'J2').map((row) => {
      const teamKey = requireNumber(row, 'teamKey');
      const robotName = textCell(prop(row, 'robotName'), 'robotName');
      const entity = teamEntity(teamKey, ctx);
      return { id: entity.id, label: entity.label, cells: { robotName } };
    });
    const data = tableData('table', [j2RobotNameMeasure], rows);
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason: rows.length === 0 ? 'No teams in this fixture' : undefined
    });
  }
);

const j3RookieMeasure = booleanMeasure('rookie', 'Rookie');
const j3 = register(
  'J3',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [j3RookieMeasure]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'the boolean rookie flag is preserved as true/false/null, never coerced to 1/0/false'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const rows: SemanticTableRow[] = asArray(ok.data, 'J3').map((row) => {
      const teamKey = requireNumber(row, 'teamKey');
      const rookie = tableCell(prop(row, 'rookie'), 'rookie');
      const entity = teamEntity(teamKey, ctx);
      return { id: entity.id, label: entity.label, cells: { rookie } };
    });
    const data = tableData('table', [j3RookieMeasure], rows);
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason: rows.length === 0 ? 'No teams in this fixture' : undefined
    });
  }
);

const j4RankingScoreMeasure = pointsMeasure('rankingScore', 'Ranking score', 2);
const j4HighestScoreMeasure = pointsMeasure('highestScore', 'Highest score');
const j4ClimbPointsMeasure = pointsMeasure('climbPoints', 'Climb points', 2);
const j4RankChangeMeasure = countMeasure('rankChange', 'Rank change');
const j4PlayedMeasure = countMeasure('played', 'Played');
const j4 = register(
  'J4',
  metadataFor({
    defaultKind: 'ranking-table',
    supportedKinds: ['ranking-table'],
    measures: [
      j4RankingScoreMeasure,
      j4HighestScoreMeasure,
      j4ClimbPointsMeasure,
      j4RankChangeMeasure,
      j4PlayedMeasure
    ],
    defaultMeasureId: 'rankingScore',
    higherIsBetter: true
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'identity is the rookie team (teamEntity), not an arbitrary numeric column',
      'the authoritative source rank is carried through verbatim; it is never derived from row/array position'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const teamKey = requireNumber(ok.data, 'teamKey');
    const rank = requireNumber(ok.data, 'rank');
    const entity = teamEntity(teamKey, ctx);
    const row: SemanticTableRow = {
      id: entity.id,
      label: entity.label,
      rank,
      cells: {
        rankingScore: requireNumber(ok.data, 'rankingScore'),
        highestScore: requireNumber(ok.data, 'highestScore'),
        climbPoints: requireNumber(ok.data, 'climbPoints'),
        rankChange: requireNumber(ok.data, 'rankChange'),
        played: requireNumber(ok.data, 'played')
      }
    };
    const data = tableData(
      'ranking-table',
      [
        j4RankingScoreMeasure,
        j4HighestScoreMeasure,
        j4ClimbPointsMeasure,
        j4RankChangeMeasure,
        j4PlayedMeasure
      ],
      [row]
    );
    return createSemanticFrame(spec, ctx, ok, data);
  }
);

const j5ScoreMeasure = pointsMeasure('score', 'Score');
const j5MatchMeasure = textMeasure('match', 'Match');
const j5 = register(
  'J5',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [j5MatchMeasure, j5ScoreMeasure],
    defaultMeasureId: 'score'
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      "the debuting team's real first match identity and score are preserved together"
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const teamKey = requireNumber(ok.data, 'teamKey');
    const tournamentKey = requireString(ok.data, 'tournamentKey');
    const matchId = requireNumber(ok.data, 'matchId');
    const score = requireNumber(ok.data, 'score');
    const entity = teamEntity(teamKey, ctx);
    const row: SemanticTableRow = {
      id: entity.id,
      label: entity.label,
      cells: { match: matchEntity(tournamentKey, matchId, ctx).label, score }
    };
    const data = tableData('table', [j5MatchMeasure, j5ScoreMeasure], [row]);
    return createSemanticFrame(spec, ctx, ok, data);
  }
);

const j6MeanRankingScoreMeasure = pointsMeasure(
  'meanRankingScore',
  'Mean ranking score',
  2
);
const j6 = register(
  'J6',
  metadataFor({
    defaultKind: 'bar',
    supportedKinds: ['bar', 'table'],
    measures: [j6MeanRankingScoreMeasure],
    defaultMeasureId: 'meanRankingScore',
    higherIsBetter: true
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'country-level and continent-level aggregates are two independent presentations, never merged into one shared entity domain',
      'bar (kind="bar") renders only countries[]; table (kind="table") renders only continents[]'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const obj = ok.data as Record<string, unknown>;
    if (spec.kind === 'bar') {
      const countryRows = asArray(obj.countries, 'J6.countries').map((row) => ({
        country: requireString(row, 'country'),
        meanRankingScore: numericCell(
          prop(row, 'meanRankingScore'),
          'meanRankingScore'
        )
      }));
      const entities = countryRows.map((c) => ({
        id: stableEntityId('country', c.country),
        label: c.country
      }));
      const data = categoricalData('bar', entities, [
        {
          id: 'meanRankingScore',
          label: j6MeanRankingScoreMeasure.label,
          measure: j6MeanRankingScoreMeasure,
          points: entities.map((entity, i) => ({
            entityId: entity.id,
            value: countryRows[i].meanRankingScore
          }))
        }
      ]);
      return createSemanticFrame(spec, ctx, ok, data, {
        emptyReason:
          entities.length === 0
            ? 'No countries recorded in this fixture'
            : undefined
      });
    }
    if (spec.kind === 'table') {
      const continentRows = asArray(obj.continents, 'J6.continents').map(
        (row) => ({
          continent: requireString(row, 'continent'),
          meanRankingScore: numericCell(
            prop(row, 'meanRankingScore'),
            'meanRankingScore'
          )
        })
      );
      const rows: SemanticTableRow[] = continentRows.map((c) => ({
        id: stableEntityId('continent', c.continent),
        label: c.continent,
        cells: { meanRankingScore: c.meanRankingScore }
      }));
      const data = tableData('table', [j6MeanRankingScoreMeasure], rows);
      return createSemanticFrame(spec, ctx, ok, data, {
        emptyReason:
          rows.length === 0
            ? 'No continents recorded in this fixture'
            : undefined
      });
    }
    throw new SemanticPreparationError(`J6: unsupported kind ${spec.kind}`);
  }
);

const j7MatchupMeasure = textMeasure('matchup', 'Matchup');
const j7WinsMeasure = countMeasure('wins', 'Wins');
const j7LossesMeasure = countMeasure('losses', 'Losses');
const j7TiesMeasure = countMeasure('ties', 'Ties');
const j7 = register(
  'J7',
  metadataFor({
    defaultKind: 'stat-tile',
    supportedKinds: ['stat-tile'],
    measures: [j7MatchupMeasure, j7WinsMeasure, j7LossesMeasure, j7TiesMeasure],
    requiredParams: ['countries']
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'both country names in the matchup are preserved verbatim alongside the win/loss/tie counts'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const obj = ok.data as Record<string, unknown>;
    const countryList = asArray(obj.countries, 'J7.countries').map((c, i) =>
      requireString({ v: c }, 'v')
    );
    const matchup =
      countryList.length > 0 ? countryList.join(' vs ') : 'Unknown matchup';
    const data = scalarData([
      { measure: j7MatchupMeasure, value: matchup },
      { measure: j7WinsMeasure, value: requireNumber(obj, 'wins') },
      { measure: j7LossesMeasure, value: requireNumber(obj, 'losses') },
      { measure: j7TiesMeasure, value: requireNumber(obj, 'ties') }
    ]);
    return createSemanticFrame(spec, ctx, ok, data);
  }
);

function teamRosterFrame(
  spec: GraphicSpec,
  ctx: AdaptContext,
  ok: OkResult,
  teamKeys: number[],
  columnLabel: string,
  emptyReason: string
): PresentationFrame {
  const rows: SemanticTableRow[] = teamKeys.map((teamKey) => {
    const entity = teamEntity(teamKey, ctx);
    return {
      id: entity.id,
      label: entity.label,
      cells: { qualifies: tableCell(true, 'qualifies') }
    };
  });
  const data = tableData(
    'table',
    [textMeasure('qualifies', columnLabel)],
    rows
  );
  return createSemanticFrame(spec, ctx, ok, data, {
    emptyReason: rows.length === 0 ? emptyReason : undefined
  });
}
const j8 = register(
  'J8',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [textMeasure('qualifies', 'Never climbed')]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'every real team in the club roster is preserved by identity; the roster is not collapsed into a count'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const teamKeys = asArray(ok.data, 'J8').map((row) =>
      requireNumber(row, 'teamKey')
    );
    return teamRosterFrame(
      spec,
      ctx,
      ok,
      teamKeys,
      'Never climbed',
      'No team failed to climb at least once in this fixture'
    );
  }
);
const j9 = register(
  'J9',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [textMeasure('qualifies', '100% climb rate')]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'every real team in the club roster is preserved by identity; the roster is not collapsed into a count'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const teamKeys = asArray(ok.data, 'J9').map((row) =>
      requireNumber(row, 'teamKey')
    );
    return teamRosterFrame(
      spec,
      ctx,
      ok,
      teamKeys,
      '100% climb rate',
      'No team climbed in every match in this fixture'
    );
  }
);

const j10TeamMeasure = textMeasure('team', 'Team');
const j10SlopeMeasure = measure(
  'slope',
  'Trend slope',
  numberFormat(2, 'pts/match')
);
const j10 = register(
  'J10',
  metadataFor({
    defaultKind: 'stat-tile',
    supportedKinds: ['stat-tile'],
    measures: [j10TeamMeasure, j10SlopeMeasure],
    defaultMeasureId: 'slope'
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'the most-improved team identity is preserved alongside its slope; a null slope (insufficient trend data) is kept null'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const teamKey = requireNumber(ok.data, 'teamKey');
    const slope = numericCell(prop(ok.data, 'slope'), 'slope');
    const data = scalarData([
      { measure: j10TeamMeasure, value: teamEntity(teamKey, ctx).label },
      { measure: j10SlopeMeasure, value: slope }
    ]);
    return createSemanticFrame(spec, ctx, ok, data);
  }
);

const j11TeamMeasure = textMeasure('team', 'Team');
const j11PartnerMeasure = textMeasure('partner', 'Partner');
const j11CountMeasure = countMeasure('count', 'Shared matches');
const j11 = register(
  'J11',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [j11TeamMeasure, j11PartnerMeasure, j11CountMeasure]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'every (team, partner) pair is preserved individually with its own real shared-match count'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const teamRows = asArray(ok.data, 'J11').map((row) => ({
      teamKey: requireNumber(row, 'teamKey'),
      partners: asArray(prop(row, 'partners'), 'J11.partners')
    }));
    const rows = flattenTableRows(teamRows, {
      parentId: (parent) => stableEntityId('team', parent.teamKey),
      path: 'partners',
      children: (parent) => parent.partners,
      row: (child, parent) => {
        const partnerKey = requireNumber(child, 'teamKey');
        const count = requireNumber(child, 'count');
        const teamLabel = teamEntity(parent.teamKey, ctx).label;
        const partnerLabel = teamEntity(partnerKey, ctx).label;
        return {
          id: stableEntityId('partner-pair', parent.teamKey, partnerKey),
          label: `${teamLabel} × ${partnerLabel}`,
          cells: { team: teamLabel, partner: partnerLabel, count }
        };
      }
    });
    const data = tableData(
      'table',
      [j11TeamMeasure, j11PartnerMeasure, j11CountMeasure],
      rows
    );
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason:
        rows.length === 0
          ? 'No alliance partnerships recorded in this fixture'
          : undefined
    });
  }
);

const j12PairMeasure = textMeasure('teams', 'Team pair');
const j12 = register(
  'J12',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [j12PairMeasure]
  }),
  {
    fixtureExpectation: 'legitimately-empty',
    emptyReason:
      'Every team in this fixture has shared at least one match with every other team; there are no zero-overlap pairs to report',
    assertions: [
      'an empty result here means every possible pair has played together at least once — a legitimately empty finding, not a source failure'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const pairs = asArray(ok.data, 'J12').map((row) =>
      asArray(prop(row, 'teamKeys'), 'J12.teamKeys').map((v) =>
        numericCell(v, 'teamKeys[]')
      )
    );
    const rows: SemanticTableRow[] = pairs.map((teamKeys, index) => {
      const validKeys = teamKeys.filter((k): k is number => k !== null);
      const labels = validKeys.map((teamKey) => teamEntity(teamKey, ctx).label);
      return {
        id: validKeys.length
          ? stableEntityId('pair', ...validKeys)
          : arrayElementId('J12', 'pairs', index),
        label: labels.join(' & '),
        cells: { teams: labels.join(' & ') }
      };
    });
    const data = tableData('table', [j12PairMeasure], rows);
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason:
        rows.length === 0
          ? 'Every team in this fixture has shared at least one match with every other team; there are no zero-overlap pairs to report'
          : undefined
    });
  }
);

const j13BestScoreMeasure = pointsMeasure('bestScore', 'Best score');
const j13BestMatchMeasure = textMeasure('bestMatch', 'Best match');
const j13WorstScoreMeasure = pointsMeasure('worstScore', 'Worst score');
const j13WorstMatchMeasure = textMeasure('worstMatch', 'Worst match');
function superMatchCells(value: unknown): {
  score: number | null;
  match: string | null;
} {
  if (value === null || value === undefined)
    return { score: null, match: null };
  return {
    score: requireNumber(value, 'score'),
    match: requireString(value, 'name')
  };
}
const j13 = register(
  'J13',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [
      j13BestScoreMeasure,
      j13BestMatchMeasure,
      j13WorstScoreMeasure,
      j13WorstMatchMeasure
    ]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      "each team's best and worst match names and scores are preserved together; a team with no recorded matches keeps null, not a fabricated 0"
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const rows: SemanticTableRow[] = asArray(ok.data, 'J13').map((row) => {
      const teamKey = requireNumber(row, 'teamKey');
      const best = superMatchCells(prop(row, 'best'));
      const worst = superMatchCells(prop(row, 'worst'));
      const entity = teamEntity(teamKey, ctx);
      return {
        id: entity.id,
        label: entity.label,
        cells: {
          bestScore: best.score,
          bestMatch: best.match,
          worstScore: worst.score,
          worstMatch: worst.match
        }
      };
    });
    const data = tableData(
      'table',
      [
        j13BestScoreMeasure,
        j13BestMatchMeasure,
        j13WorstScoreMeasure,
        j13WorstMatchMeasure
      ],
      rows
    );
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason:
        rows.length === 0 ? 'No teams recorded in this fixture' : undefined
    });
  }
);

const j14WinsMeasure = countMeasure('wins', 'Winning-alliance appearances');
const j14 = register(
  'J14',
  metadataFor({
    defaultKind: 'bar',
    supportedKinds: ['bar', 'table'],
    measures: [j14WinsMeasure],
    defaultMeasureId: 'wins',
    higherIsBetter: true
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'every team keeps its real win count, including a legitimate 0'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const entries = extractTeamValues(ok.data, 'wins');
    return teamNumberFrame(spec, ctx, ok, entries, j14WinsMeasure);
  }
);

const j15TeamMeasure = textMeasure('team', 'Team');
const j15CountryMeasure = textMeasure('country', 'Country');
const j15LatitudeMeasure = measure(
  'latitude',
  'Latitude',
  numberFormat(2, '°')
);
const j15AreaMeasure = measure('area', 'Area', numberFormat(0, 'km²'));
function j15FactRow(
  fact: string,
  label: string,
  value: unknown,
  ctx: AdaptContext
): SemanticTableRow {
  const teamKey = requireNumber(value, 'teamKey');
  const country = requireString(value, 'country');
  const latitude = requireNumber(value, 'latitude');
  const area = requireNumber(value, 'area');
  const team = teamEntity(teamKey, ctx);
  return {
    id: stableEntityId('fact', fact),
    label,
    cells: { team: team.label, country, latitude, area }
  };
}
const j15 = register(
  'J15',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [
      j15TeamMeasure,
      j15CountryMeasure,
      j15LatitudeMeasure,
      j15AreaMeasure
    ]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'each of the three named facts (northernmost, southernmost, smallestNation) is preserved as its own row with its real team/country/latitude/area',
      'the result is rendered as a fact table, never coerced into a geo-map'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const rows: SemanticTableRow[] = [
      j15FactRow(
        'northernmost',
        'Northernmost',
        prop(ok.data, 'northernmost'),
        ctx
      ),
      j15FactRow(
        'southernmost',
        'Southernmost',
        prop(ok.data, 'southernmost'),
        ctx
      ),
      j15FactRow(
        'smallestNation',
        'Smallest nation',
        prop(ok.data, 'smallestNation'),
        ctx
      )
    ];
    const data = tableData(
      'table',
      [j15TeamMeasure, j15CountryMeasure, j15LatitudeMeasure, j15AreaMeasure],
      rows
    );
    return createSemanticFrame(spec, ctx, ok, data);
  }
);

// ---------------------------------------------------------------------------
// K1-K13 — alliance / tournament-scoped playoff stats
// ---------------------------------------------------------------------------

const K_ALLIANCE_NUMBER_IDS: {
  id: string;
  name: string;
  higherIsBetter?: boolean;
}[] = [
  { id: 'K1', name: 'Alliance cumulative score', higherIsBetter: true },
  { id: 'K2', name: 'Alliance average', higherIsBetter: true },
  { id: 'K3', name: 'Alliance composition strength', higherIsBetter: true },
  { id: 'K11', name: 'Finals sum', higherIsBetter: true }
];
const kAllianceNumberRegistrations = K_ALLIANCE_NUMBER_IDS.map(
  ({ id, name, higherIsBetter }) => {
    const m = pointsMeasure('value', name);
    return register(
      id,
      metadataFor({
        defaultKind: 'bar',
        supportedKinds: ['bar', 'table'],
        measures: [m],
        defaultMeasureId: 'value',
        higherIsBetter
      }),
      {
        fixtureExpectation: 'nonempty',
        assertions: [
          'each alliance keeps its tournament-qualified identity (tournamentKey + allianceSeed)',
          'an alliance with no qualifying playoff provenance keeps a null value, never a fabricated zero'
        ]
      },
      (result, spec, ctx) => {
        const ok = requireOkResult(result);
        const entries = extractAllianceValues(ok.data, 'value');
        return allianceNumberFrame(spec, ctx, ok, entries, m);
      }
    );
  }
);

const k4SeedMeasure = countMeasure('seed', 'Seed');
const k4DeltaMeasure = countMeasure('delta', 'Seed − rank');
const k4 = register(
  'K4',
  metadataFor({
    defaultKind: 'ranking-table',
    supportedKinds: ['ranking-table'],
    measures: [k4SeedMeasure, k4DeltaMeasure]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      "each alliance's authoritative playoff rank is carried through verbatim, never derived from array position"
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const rows: SemanticTableRow[] = extractAllianceRows(ok.data).map((row) => {
      const seed = requireNumber(row.value, 'seed');
      const rank = requireNumber(row.value, 'rank');
      const delta = requireNumber(row.value, 'delta');
      const entity = allianceEntity(row.tournamentKey, row.allianceSeed);
      return {
        id: entity.id,
        label: entity.label,
        rank,
        cells: { seed, delta }
      };
    });
    const data = tableData(
      'ranking-table',
      [k4SeedMeasure, k4DeltaMeasure],
      rows
    );
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason:
        rows.length === 0 ? 'No alliances recorded in this fixture' : undefined
    });
  }
);

const k5AllianceMeasure = textMeasure('alliance', 'Alliance');
const k5CountMeasure = countMeasure('count', 'Matches played');
const k5 = register(
  'K5',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [k5AllianceMeasure, k5CountMeasure]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      "each alliance member's real appearance count is preserved by team identity",
      'per-match which-three-played detail is preserved as readable notes rather than dropped'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const groups = extractAllianceRows(ok.data);
    const withData = groups.filter((g) => g.value !== null);
    const rows = flattenTableRows(withData, {
      parentId: (parent) =>
        stableEntityId('alliance', parent.tournamentKey, parent.allianceSeed),
      path: 'value.appearances',
      children: (parent) =>
        asArray(prop(parent.value, 'appearances'), 'K5.appearances'),
      row: (child, parent) => {
        const teamKey = requireNumber(child, 'teamKey');
        const count = requireNumber(child, 'count');
        const alliance = allianceEntity(
          parent.tournamentKey,
          parent.allianceSeed
        );
        return {
          id: stableEntityId(
            'alliance-team',
            parent.tournamentKey,
            parent.allianceSeed,
            teamKey
          ),
          label: teamEntity(teamKey, ctx).label,
          cells: { alliance: alliance.label, count }
        };
      }
    });
    const notes: string[] = [];
    for (const g of groups) {
      if (g.value === null) {
        notes.push(
          `${allianceEntity(g.tournamentKey, g.allianceSeed).label}: rotation not available (insufficient qualification-close provenance)`
        );
        continue;
      }
      const matches = prop(g.value, 'matches');
      if (Array.isArray(matches)) {
        for (const m of matches) {
          const tournamentKey = requireString(m, 'tournamentKey');
          const matchId = requireNumber(m, 'matchId');
          const playing = asArray(prop(m, 'playing'), 'K5.playing').map(
            (tk) => {
              const teamKey = numericCell(tk, 'playing[]');
              if (teamKey === null)
                throw new SemanticPreparationError(
                  'K5: playing team keys cannot be null'
                );
              return teamEntity(teamKey, ctx).label;
            }
          );
          notes.push(
            `${matchEntity(tournamentKey, matchId, ctx).label}: ${playing.join(', ')} played`
          );
        }
      }
    }
    const data = tableData('table', [k5AllianceMeasure, k5CountMeasure], rows);
    return createSemanticFrame(spec, ctx, ok, data, {
      notes,
      emptyReason:
        rows.length === 0
          ? 'No alliance rotation data available in this fixture'
          : undefined
    });
  }
);

const k6AllianceMeasure = textMeasure('alliance', 'Alliance');
const k6SitOutMeasure = countMeasure('sitOut', 'Sit-outs');
const k6 = register(
  'K6',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [k6AllianceMeasure, k6SitOutMeasure]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      "each alliance member's real sit-out count is preserved by team identity; alliances lacking data are noted, not fabricated as zero rows"
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const groups = extractAllianceRows(ok.data);
    const withData = groups.filter((g) => g.value !== null);
    const rows = flattenTableRows(withData, {
      parentId: (parent) =>
        stableEntityId('alliance', parent.tournamentKey, parent.allianceSeed),
      path: 'value',
      children: (parent) => asArray(parent.value, 'K6.value'),
      row: (child, parent) => {
        const teamKey = requireNumber(child, 'teamKey');
        const sitOut = requireNumber(child, 'sitOut');
        const alliance = allianceEntity(
          parent.tournamentKey,
          parent.allianceSeed
        );
        return {
          id: stableEntityId(
            'alliance-team',
            parent.tournamentKey,
            parent.allianceSeed,
            teamKey
          ),
          label: teamEntity(teamKey, ctx).label,
          cells: { alliance: alliance.label, sitOut }
        };
      }
    });
    const notes = groups
      .filter((g) => g.value === null)
      .map(
        (g) =>
          `${allianceEntity(g.tournamentKey, g.allianceSeed).label}: sit-out data not available`
      );
    const data = tableData('table', [k6AllianceMeasure, k6SitOutMeasure], rows);
    return createSemanticFrame(spec, ctx, ok, data, {
      notes,
      emptyReason:
        rows.length === 0
          ? 'No sit-out data available in this fixture'
          : undefined
    });
  }
);

const k7WithDrawnMeasure = pointsMeasure(
  'withDrawn',
  'Mean score, drawn 4th playing',
  2
);
const k7WithoutDrawnMeasure = pointsMeasure(
  'withoutDrawn',
  'Mean score, drawn 4th sitting',
  2
);
const k7DeltaMeasure = pointsMeasure('delta', 'Delta', 2);
const k7 = register(
  'K7',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [k7WithDrawnMeasure, k7WithoutDrawnMeasure, k7DeltaMeasure]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'each alliance keeps its own withDrawn/withoutDrawn means; either can be a real null when that condition never occurred'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const groups = extractAllianceRows(ok.data).filter((g) => g.value !== null);
    const rows: SemanticTableRow[] = groups.map((g) => {
      const entity = allianceEntity(g.tournamentKey, g.allianceSeed);
      return {
        id: entity.id,
        label: entity.label,
        cells: {
          withDrawn: numericCell(prop(g.value, 'withDrawn'), 'withDrawn'),
          withoutDrawn: numericCell(
            prop(g.value, 'withoutDrawn'),
            'withoutDrawn'
          ),
          delta: requireNumber(g.value, 'delta')
        }
      };
    });
    const data = tableData(
      'table',
      [k7WithDrawnMeasure, k7WithoutDrawnMeasure, k7DeltaMeasure],
      rows
    );
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason:
        rows.length === 0
          ? 'No random-draw impact data available in this fixture'
          : undefined
    });
  }
);

const k8QualScoreMeasure = pointsMeasure(
  'qualificationRankingScore',
  'Qualification ranking score',
  2
);
const k8PlayoffTotalMeasure = pointsMeasure('playoffTotal', 'Playoff total');
const k8AllianceMeasure = textMeasure('alliance', 'Alliance');
const k8 = register(
  'K8',
  metadataFor({
    defaultKind: 'ranking-table',
    supportedKinds: ['ranking-table'],
    measures: [k8AllianceMeasure, k8QualScoreMeasure, k8PlayoffTotalMeasure],
    higherIsBetter: true
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      "identity is the captain's own team; the authoritative playoff rank is carried through verbatim"
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const rows: SemanticTableRow[] = extractAllianceRows(ok.data).map((row) => {
      const captainTeamKey = requireNumber(row.value, 'captain');
      const playoffRank = requireNumber(row.value, 'playoffRank');
      const team = teamEntity(captainTeamKey, ctx);
      const alliance = allianceEntity(row.tournamentKey, row.allianceSeed);
      return {
        id: stableEntityId(
          'alliance-captain',
          row.tournamentKey,
          row.allianceSeed,
          captainTeamKey
        ),
        label: team.label,
        rank: playoffRank,
        cells: {
          alliance: alliance.label,
          qualificationRankingScore: requireNumber(
            row.value,
            'qualificationRankingScore'
          ),
          playoffTotal: requireNumber(row.value, 'playoffTotal')
        }
      };
    });
    const data = tableData(
      'ranking-table',
      [k8AllianceMeasure, k8QualScoreMeasure, k8PlayoffTotalMeasure],
      rows
    );
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason:
        rows.length === 0
          ? 'No captain performance data available in this fixture'
          : undefined
    });
  }
);

const k9AllianceMeasure = textMeasure('alliance', 'Alliance');
const k9QualScoreMeasure = pointsMeasure(
  'qualificationRankingScore',
  'Qualification ranking score',
  2
);
const k9MeanAllianceScoreMeasure = pointsMeasure(
  'meanAllianceScore',
  'Mean alliance score',
  2
);
const k9 = register(
  'K9',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [
      k9AllianceMeasure,
      k9QualScoreMeasure,
      k9MeanAllianceScoreMeasure
    ]
  }),
  {
    fixtureExpectation: 'source-failure',
    assertions: [
      'this catalogue id has no qualifying captured data for any selected entity in the golden fixture: requireOkResult must surface the real failure reason, never a fabricated empty table'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const rows: SemanticTableRow[] = extractAllianceRows(ok.data).map((row) => {
      const teamKey = requireNumber(row.value, 'teamKey');
      const alliance = allianceEntity(row.tournamentKey, row.allianceSeed);
      return {
        id: stableEntityId(
          'alliance-team',
          row.tournamentKey,
          row.allianceSeed,
          teamKey
        ),
        label: teamEntity(teamKey, ctx).label,
        cells: {
          alliance: alliance.label,
          qualificationRankingScore: requireNumber(
            row.value,
            'qualificationRankingScore'
          ),
          meanAllianceScore: numericCell(
            prop(row.value, 'meanAllianceScore'),
            'meanAllianceScore'
          )
        }
      };
    });
    const data = tableData(
      'table',
      [k9AllianceMeasure, k9QualScoreMeasure, k9MeanAllianceScoreMeasure],
      rows
    );
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason:
        rows.length === 0
          ? 'No third-slot value data available in this fixture'
          : undefined
    });
  }
);

const k10RedScoreMeasure = pointsMeasure('redScore', 'Red score');
const k10BlueScoreMeasure = pointsMeasure('blueScore', 'Blue score');
const k10RedAllianceMeasure = countMeasure('redAlliance', 'Red alliance seed');
const k10BlueAllianceMeasure = countMeasure(
  'blueAlliance',
  'Blue alliance seed'
);
const k10 = register(
  'K10',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [
      k10RedScoreMeasure,
      k10BlueScoreMeasure,
      k10RedAllianceMeasure,
      k10BlueAllianceMeasure
    ]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'every match keeps its tournament-qualified identity; an alliance seed not yet known (e.g. pre-playoff qualification matches) is a real null, never a fabricated 0'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const rows: SemanticTableRow[] = asArray(ok.data, 'K10').map((row) => {
      const tournamentKey = requireString(row, 'tournamentKey');
      const matchId = requireNumber(row, 'matchId');
      const entity = matchEntity(tournamentKey, matchId, ctx);
      return {
        id: entity.id,
        label: entity.label,
        cells: {
          redScore: requireNumber(row, 'redScore'),
          blueScore: requireNumber(row, 'blueScore'),
          redAlliance: numericCell(prop(row, 'redAlliance'), 'redAlliance'),
          blueAlliance: numericCell(prop(row, 'blueAlliance'), 'blueAlliance')
        }
      };
    });
    const data = tableData(
      'table',
      [
        k10RedScoreMeasure,
        k10BlueScoreMeasure,
        k10RedAllianceMeasure,
        k10BlueAllianceMeasure
      ],
      rows
    );
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason:
        rows.length === 0
          ? 'No round-robin matches recorded in this fixture'
          : undefined
    });
  }
);

const k12CurrentMeasure = pointsMeasure('current', 'Current points');
const k12RemainingMeasure = pointsMeasure('remaining', 'Remaining points');
const k12NonPenaltyMaxMeasure = pointsMeasure(
  'nonPenaltyMaximum',
  'Non-penalty maximum'
);
const k12GapMeasure = pointsMeasure('gapToThird', 'Gap to 3rd');
const k12EliminatedMeasure = booleanMeasure(
  'eliminatedWithoutPenalties',
  'Eliminated (no penalties)'
);
const k12ClinchedMeasure = textMeasure('clinched', 'Clinched');
const k12ReasonMeasure = textMeasure('reason', 'Reason');
const k12 = register(
  'K12',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [
      k12CurrentMeasure,
      k12RemainingMeasure,
      k12NonPenaltyMaxMeasure,
      k12GapMeasure,
      k12EliminatedMeasure,
      k12ClinchedMeasure,
      k12ReasonMeasure
    ]
  }),
  {
    fixtureExpectation: 'source-failure',
    assertions: [
      'this catalogue id has no qualifying captured data for any selected entity in the golden fixture: requireOkResult must surface the real failure reason',
      '`clinched` is currently always null by schema (a documented placeholder, not yet computed) and must be rendered as an explicit null cell, never omitted or coerced'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const rows: SemanticTableRow[] = extractAllianceRows(ok.data).map((row) => {
      const entity = allianceEntity(row.tournamentKey, row.allianceSeed);
      return {
        id: entity.id,
        label: entity.label,
        cells: {
          current: requireNumber(row.value, 'current'),
          remaining: requireNumber(row.value, 'remaining'),
          nonPenaltyMaximum: requireNumber(row.value, 'nonPenaltyMaximum'),
          gapToThird: requireNumber(row.value, 'gapToThird'),
          eliminatedWithoutPenalties: requireBoolean(
            row.value,
            'eliminatedWithoutPenalties'
          ),
          clinched: tableCell(prop(row.value, 'clinched'), 'clinched'),
          reason: requireString(row.value, 'reason')
        }
      };
    });
    const data = tableData(
      'table',
      [
        k12CurrentMeasure,
        k12RemainingMeasure,
        k12NonPenaltyMaxMeasure,
        k12GapMeasure,
        k12EliminatedMeasure,
        k12ClinchedMeasure,
        k12ReasonMeasure
      ],
      rows
    );
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason:
        rows.length === 0
          ? 'No clinch/elimination data available in this fixture'
          : undefined
    });
  }
);

const k13ProbabilityMeasure = percentFormat('ratio', 0);
const k13AdvancementMeasure = measure(
  'advancementProbability',
  'Advancement probability',
  k13ProbabilityMeasure
);
const k13SamplesMeasure = countMeasure('samples', 'Samples');
const k13 = register(
  'K13',
  metadataFor({
    defaultKind: 'bar',
    supportedKinds: ['bar', 'table'],
    measures: [k13AdvancementMeasure, k13SamplesMeasure],
    defaultMeasureId: 'advancementProbability',
    higherIsBetter: true
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'each alliance keeps its tournament-qualified identity; the simulated advancement probability and sample count are both preserved'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const entries = asArray(ok.data, 'K13').map((row) => ({
      tournamentKey: requireString(row, 'tournamentKey'),
      allianceSeed: requireNumber(row, 'allianceSeed'),
      advancementProbability: requireNumber(row, 'advancementProbability'),
      samples: requireNumber(row, 'samples')
    }));
    const entities = entries.map((e) =>
      allianceEntity(e.tournamentKey, e.allianceSeed)
    );
    if (spec.kind === 'bar') {
      const data = categoricalData('bar', entities, [
        {
          id: 'advancementProbability',
          label: k13AdvancementMeasure.label,
          measure: k13AdvancementMeasure,
          points: entities.map((entity, i) => ({
            entityId: entity.id,
            value: entries[i].advancementProbability
          }))
        }
      ]);
      return createSemanticFrame(spec, ctx, ok, data, {
        emptyReason:
          entities.length === 0
            ? 'No alliances recorded in this fixture'
            : undefined
      });
    }
    if (spec.kind === 'table') {
      const rows: SemanticTableRow[] = entities.map((entity, i) => ({
        id: entity.id,
        label: entity.label,
        cells: {
          advancementProbability: entries[i].advancementProbability,
          samples: entries[i].samples
        }
      }));
      const data = tableData(
        'table',
        [k13AdvancementMeasure, k13SamplesMeasure],
        rows
      );
      return createSemanticFrame(spec, ctx, ok, data, {
        emptyReason:
          rows.length === 0
            ? 'No alliances recorded in this fixture'
            : undefined
      });
    }
    throw new SemanticPreparationError(`K13: unsupported kind ${spec.kind}`);
  }
);

// ---------------------------------------------------------------------------
// L1-L14 — margin decomposition & ranking sensitivity (DER)
// ---------------------------------------------------------------------------

function matchValueTableFrame(
  spec: GraphicSpec,
  ctx: AdaptContext,
  ok: OkResult,
  columns: SemanticMeasure[],
  cellsFor: (value: unknown) => Record<string, SemanticCell>,
  emptyReason: string
): PresentationFrame {
  const rows: SemanticTableRow[] = asArray(ok.data, 'matchRows').map((row) => {
    const tournamentKey = requireString(row, 'tournamentKey');
    const matchId = requireNumber(row, 'matchId');
    const entity = matchEntity(tournamentKey, matchId, ctx);
    return {
      id: entity.id,
      label: entity.label,
      cells: cellsFor(prop(row, 'value'))
    };
  });
  const data = tableData('table', columns, rows);
  return createSemanticFrame(spec, ctx, ok, data, {
    emptyReason: rows.length === 0 ? emptyReason : undefined
  });
}

const l1SuppMultMeasure = measure(
  'suppressionMultiplier',
  'Suppression multiplier',
  numberFormat(2)
);
const l1PartnerMeasure = pointsMeasure('partner', 'Partner');
const l1FoulsMeasure = pointsMeasure('fouls', 'Fouls', 2);
const l1RoundingMeasure = pointsMeasure('rounding', 'Rounding', 2);
const l1MarginMeasure = pointsMeasure('margin', 'Margin');
const l1 = register(
  'L1',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [
      l1SuppMultMeasure,
      l1PartnerMeasure,
      l1FoulsMeasure,
      l1RoundingMeasure,
      l1MarginMeasure
    ]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'every term of the margin decomposition is preserved per match with its tournament-qualified identity'
    ]
  },
  (result, spec, ctx) =>
    matchValueTableFrame(
      spec,
      ctx,
      requireOkResult(result),
      [
        l1SuppMultMeasure,
        l1PartnerMeasure,
        l1FoulsMeasure,
        l1RoundingMeasure,
        l1MarginMeasure
      ],
      (value) => ({
        suppressionMultiplier: requireNumber(value, 'suppressionMultiplier'),
        partner: requireNumber(value, 'partner'),
        fouls: requireNumber(value, 'fouls'),
        rounding: requireNumber(value, 'rounding'),
        margin: requireNumber(value, 'margin')
      }),
      'No matches recorded in this fixture'
    )
);

const l2ExtinguisherMeasure = pointsMeasure('extinguisher', 'Extinguisher');
const l2CoopMeasure = pointsMeasure('coopertition', 'Coopertition');
const l2SharedMeasure = pointsMeasure('shared', 'Shared');
const l2DirectMeasure = pointsMeasure(
  'directMarginContribution',
  'Direct margin contribution'
);
const l2CaveatMeasure = textMeasure('penaltyCaveat', 'Caveat');
const l2 = register(
  'L2',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [
      l2ExtinguisherMeasure,
      l2CoopMeasure,
      l2SharedMeasure,
      l2DirectMeasure,
      l2CaveatMeasure
    ]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'the explanatory penalty caveat text is preserved verbatim per match, not dropped for being non-numeric'
    ]
  },
  (result, spec, ctx) =>
    matchValueTableFrame(
      spec,
      ctx,
      requireOkResult(result),
      [
        l2ExtinguisherMeasure,
        l2CoopMeasure,
        l2SharedMeasure,
        l2DirectMeasure,
        l2CaveatMeasure
      ],
      (value) => ({
        extinguisher: requireNumber(value, 'extinguisher'),
        coopertition: requireNumber(value, 'coopertition'),
        shared: requireNumber(value, 'shared'),
        directMarginContribution: requireNumber(
          value,
          'directMarginContribution'
        ),
        penaltyCaveat: requireString(value, 'penaltyCaveat')
      }),
      'No matches recorded in this fixture'
    )
);

const l34RedMeasure = pointsMeasure('red', 'Red recomputed score');
const l34BlueMeasure = pointsMeasure('blue', 'Blue recomputed score');
const l34ChangedMeasure = booleanMeasure('resultChanged', 'Result changed');
function registerRecomputeComparison(id: 'L3' | 'L4', description: string) {
  return register(
    id,
    metadataFor({
      defaultKind: 'table',
      supportedKinds: ['table'],
      measures: [l34RedMeasure, l34BlueMeasure, l34ChangedMeasure]
    }),
    {
      fixtureExpectation: 'nonempty',
      assertions: [
        `${description}; the boolean resultChanged flag is preserved verbatim, never coerced`
      ]
    },
    (result, spec, ctx) =>
      matchValueTableFrame(
        spec,
        ctx,
        requireOkResult(result),
        [l34RedMeasure, l34BlueMeasure, l34ChangedMeasure],
        (value) => ({
          red: requireNumber(value, 'red'),
          blue: requireNumber(value, 'blue'),
          resultChanged: requireBoolean(value, 'resultChanged')
        }),
        'No matches recorded in this fixture'
      )
  );
}
const l3 = registerRecomputeComparison(
  'L3',
  'each match keeps its recomputed red/blue score with mult=1.0 both sides'
);
const l4 = registerRecomputeComparison(
  'L4',
  'each match keeps its recomputed red/blue score with partnerPts=0 both sides'
);

const l56WinRateMeasure = percentFormat('ratio', 1);
const l56BucketMeasure = countMeasure('bucket', 'Bucket');
function registerBucketedWinRate(id: 'L5' | 'L6', label: string) {
  const winRateMeasure = measure('winRate', label, l56WinRateMeasure);
  const matchesMeasure = countMeasure('matches', 'Matches');
  const tiesMeasure = countMeasure('ties', 'Ties');
  return register(
    id,
    metadataFor({
      defaultKind: 'grouped-bar',
      supportedKinds: ['grouped-bar', 'table'],
      measures: [winRateMeasure, matchesMeasure, tiesMeasure],
      defaultMeasureId: 'winRate'
    }),
    {
      fixtureExpectation: 'nonempty',
      assertions: [
        'each bucket keeps its own real bucket boundary value, win rate, match count and tie count; a bucket with no eligible matches keeps a null win rate'
      ]
    },
    (result, spec, ctx) => {
      const ok = requireOkResult(result);
      const entries = asArray(ok.data, id).map((row) => ({
        bucket: requireNumber(row, 'bucket'),
        winRate: numericCell(prop(row, 'winRate'), 'winRate'),
        matches: requireNumber(row, 'matches'),
        ties: requireNumber(row, 'ties')
      }));
      const entities = entries.map((e) => ({
        id: stableEntityId('bucket', e.bucket),
        label: `Bucket ${e.bucket}`
      }));
      if (spec.kind === 'grouped-bar') {
        const data = categoricalData('grouped-bar', entities, [
          {
            id: 'winRate',
            label: winRateMeasure.label,
            measure: winRateMeasure,
            points: entities.map((entity, i) => ({
              entityId: entity.id,
              value: entries[i].winRate
            }))
          },
          {
            id: 'matches',
            label: matchesMeasure.label,
            measure: matchesMeasure,
            points: entities.map((entity, i) => ({
              entityId: entity.id,
              value: entries[i].matches
            }))
          },
          {
            id: 'ties',
            label: tiesMeasure.label,
            measure: tiesMeasure,
            points: entities.map((entity, i) => ({
              entityId: entity.id,
              value: entries[i].ties
            }))
          }
        ]);
        return createSemanticFrame(spec, ctx, ok, data, {
          emptyReason:
            entities.length === 0
              ? 'No buckets recorded in this fixture'
              : undefined
        });
      }
      if (spec.kind === 'table') {
        const rows: SemanticTableRow[] = entities.map((entity, i) => ({
          id: entity.id,
          label: entity.label,
          cells: {
            bucket: entries[i].bucket,
            winRate: entries[i].winRate,
            matches: entries[i].matches,
            ties: entries[i].ties
          }
        }));
        const data = tableData(
          'table',
          [l56BucketMeasure, winRateMeasure, matchesMeasure, tiesMeasure],
          rows
        );
        return createSemanticFrame(spec, ctx, ok, data, {
          emptyReason:
            rows.length === 0
              ? 'No buckets recorded in this fixture'
              : undefined
        });
      }
      throw new SemanticPreparationError(
        `${id}: unsupported kind ${spec.kind}`
      );
    }
  );
}
const l5 = registerBucketedWinRate('L5', 'Win rate by multiplier band');
const l6 = registerBucketedWinRate(
  'L6',
  'Win rate by suppression differential'
);

const l7Zone3Measure = pointsMeasure('zone3Value', 'Zone 3 value', 2);
const l7AdditionalBallsMeasure = countMeasure(
  'additionalBalls',
  'Additional balls'
);
const l7ClimbWorthMeasure = booleanMeasure(
  'climbWorthMore',
  'Climb worth more'
);
const l7 = register(
  'L7',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [l7Zone3Measure, l7AdditionalBallsMeasure, l7ClimbWorthMeasure]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'each match keeps its own break-even zone-3 value, additional-ball count and boolean verdict'
    ]
  },
  (result, spec, ctx) =>
    matchValueTableFrame(
      spec,
      ctx,
      requireOkResult(result),
      [l7Zone3Measure, l7AdditionalBallsMeasure, l7ClimbWorthMeasure],
      (value) => ({
        zone3Value: requireNumber(value, 'zone3Value'),
        additionalBalls: requireNumber(value, 'additionalBalls'),
        climbWorthMore: requireBoolean(value, 'climbWorthMore')
      }),
      'No matches recorded in this fixture'
    )
);

const l8MatchMeasure = textMeasure('match', 'Dropped match');
const l8ScoreMeasure = pointsMeasure('score', 'Dropped score');
const l8 = register(
  'L8',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [l8MatchMeasure, l8ScoreMeasure]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      "each team's currently-discarded match identity and score are preserved together; a team with nothing yet discarded keeps a real null"
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const rows: SemanticTableRow[] = asArray(ok.data, 'L8').map((row) => {
      const teamKey = requireNumber(row, 'teamKey');
      const value = prop(row, 'value');
      const entity = teamEntity(teamKey, ctx);
      if (value === null)
        return {
          id: entity.id,
          label: entity.label,
          cells: { match: null, score: null }
        };
      const tournamentKey = requireString(value, 'tournamentKey');
      const matchId = requireNumber(value, 'matchId');
      const score = requireNumber(value, 'score');
      return {
        id: entity.id,
        label: entity.label,
        cells: { match: matchEntity(tournamentKey, matchId, ctx).label, score }
      };
    });
    const data = tableData('table', [l8MatchMeasure, l8ScoreMeasure], rows);
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason:
        rows.length === 0 ? 'No teams recorded in this fixture' : undefined
    });
  }
);

const l9Measure = pointsMeasure('value', 'Next drop threshold');
const l9 = register(
  'L9',
  metadataFor({
    defaultKind: 'bar',
    supportedKinds: ['bar', 'table'],
    measures: [l9Measure],
    defaultMeasureId: 'value'
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'every team keeps its real threshold score, including a legitimate 0'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const entries = extractTeamValues(ok.data, 'value');
    return teamNumberFrame(spec, ctx, ok, entries, l9Measure);
  }
);

const l10Measure = pointsMeasure('points', 'Ranking sensitivity');
const l10 = register(
  'L10',
  metadataFor({
    defaultKind: 'bar',
    supportedKinds: ['bar', 'table'],
    measures: [l10Measure],
    defaultMeasureId: 'points'
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'every team keeps its real sensitivity value; a team for which no single-match swing changes rank keeps a real null, never a fabricated 0'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const entries = extractTeamValues(ok.data, 'points');
    return teamNumberFrame(spec, ctx, ok, entries, l10Measure);
  }
);

const l11BoundaryMeasure = countMeasure('boundary', 'Boundary');
const l11RankingScoreMeasure = pointsMeasure(
  'rankingScore',
  'Ranking score',
  2
);
const l11 = register(
  'L11',
  metadataFor({
    defaultKind: 'ranking-table',
    supportedKinds: ['ranking-table'],
    measures: [l11BoundaryMeasure, l11RankingScoreMeasure],
    higherIsBetter: true
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'the nested teams[].rank is authoritative and is carried through verbatim; rows are never renumbered by array position',
      'a boundary with no bubble teams contributes zero rows without fabricating placeholders'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const groups = asArray(ok.data, 'L11').map((row) => ({
      boundary: requireNumber(row, 'boundary'),
      teams: asArray(prop(row, 'teams'), 'L11.teams')
    }));
    const rows = flattenTableRows(groups, {
      parentId: (parent) => stableEntityId('boundary', parent.boundary),
      path: 'teams',
      children: (parent) => parent.teams,
      row: (child, parent) => {
        const teamKey = requireNumber(child, 'teamKey');
        const rank = requireNumber(child, 'rank');
        const rankingScore = requireNumber(child, 'rankingScore');
        return {
          id: stableEntityId('boundary-team', parent.boundary, teamKey),
          label: teamEntity(teamKey, ctx).label,
          rank,
          cells: { boundary: parent.boundary, rankingScore }
        };
      }
    });
    const data = tableData(
      'ranking-table',
      [l11BoundaryMeasure, l11RankingScoreMeasure],
      rows
    );
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason:
        rows.length === 0
          ? 'No team sits within one match of a rank boundary in this fixture'
          : undefined
    });
  }
);

const l12Measure = measure('spread', 'Partner-luck spread', numberFormat(2));
const l12 = register(
  'L12',
  metadataFor({
    defaultKind: 'bar',
    supportedKinds: ['bar', 'table'],
    measures: [l12Measure],
    defaultMeasureId: 'spread'
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'every team keeps its real partner-OPR spread; a team with too few partners for a spread keeps a real null'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const entries = extractTeamValues(ok.data, 'spread');
    return teamNumberFrame(spec, ctx, ok, entries, l12Measure);
  }
);

const l13Measure = measure('r', 'Pearson r', numberFormat(3));
const l13 = register(
  'L13',
  metadataFor({
    defaultKind: 'heatmap',
    supportedKinds: ['heatmap'],
    measures: [l13Measure]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'every metric pair keeps its real correlation coefficient, including a real null when a pair is degenerate'
    ]
  },
  (result, spec, ctx) => {
    const ok = requireOkResult(result);
    const obj = ok.data as Record<string, unknown>;
    const metrics = asArray(obj.metrics, 'L13.metrics').map((m) =>
      requireString({ v: m }, 'v')
    );
    const matrixRows = asArray(obj.matrix, 'L13.matrix');
    const entities = metrics.map((name) => ({
      id: stableEntityId('metric', name),
      label: name
    }));
    const cells = entities.flatMap((rowEntity, i) => {
      const matrixRow = asArray(matrixRows[i], `L13.matrix[${i}]`);
      return entities.map((colEntity, j) => ({
        xId: colEntity.id,
        yId: rowEntity.id,
        value: numericCell(matrixRow[j], `L13.matrix[${i}][${j}]`)
      }));
    });
    const data = {
      kind: 'heatmap' as const,
      xEntities: entities,
      yEntities: entities,
      measure: l13Measure,
      domain: [-1, 1] as [number, number],
      cells
    };
    return createSemanticFrame(spec, ctx, ok, data, {
      emptyReason:
        cells.length === 0
          ? 'No metrics available for correlation in this fixture'
          : undefined
    });
  }
);

const l14TermMeasure = textMeasure('term', 'Deciding term');
const l14PointsMeasure = pointsMeasure('points', 'Points', 2);
const l14 = register(
  'L14',
  metadataFor({
    defaultKind: 'table',
    supportedKinds: ['table'],
    measures: [l14TermMeasure, l14PointsMeasure]
  }),
  {
    fixtureExpectation: 'nonempty',
    assertions: [
      'each match keeps its own real deciding-term name and point value; the term name is preserved as text, never dropped'
    ]
  },
  (result, spec, ctx) =>
    matchValueTableFrame(
      spec,
      ctx,
      requireOkResult(result),
      [l14TermMeasure, l14PointsMeasure],
      (value) => ({
        term: requireString(value, 'term'),
        points: requireNumber(value, 'points')
      }),
      'No matches recorded in this fixture'
    )
);

// ---------------------------------------------------------------------------
// Public export
// ---------------------------------------------------------------------------

export const FGC2026_I_L_REGISTRATIONS: readonly SemanticRegistration[] = [
  ...iMatchNumberRegistrations,
  i2,
  i7,
  i8,
  i10,
  j1,
  j2,
  j3,
  j4,
  j5,
  j6,
  j7,
  j8,
  j9,
  j10,
  j11,
  j12,
  j13,
  j14,
  j15,
  ...kAllianceNumberRegistrations,
  k4,
  k5,
  k6,
  k7,
  k8,
  k9,
  k10,
  k12,
  k13,
  l1,
  l2,
  l3,
  l4,
  l5,
  l6,
  l7,
  l8,
  l9,
  l10,
  l11,
  l12,
  l13,
  l14
];

export const FGC2026_I_L_REGISTRATIONS_BY_KEY: ReadonlyMap<
  string,
  SemanticRegistration
> = new Map(
  FGC2026_I_L_REGISTRATIONS.map((registration) => [
    semanticRegistrationKey(registration.seasonKey, registration.catalogueId),
    registration
  ])
);
