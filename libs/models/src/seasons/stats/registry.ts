import { z } from 'zod';
import { paramsFor } from './parameter-schemas.js';
import { schemaFor } from './result-schemas.js';
import { catalogue } from './catalogue.js';
import {
  type StatDefinition,
  type StatDependency,
  type CalculatorContext,
  type StatsQuery,
  type StatResult,
  commonParamsSchema,
  resultSchema,
  querySchema,
  notFound,
  unavailable,
  insufficient
} from './types.js';
import { reconciliation } from './util/action-event-replay.js';
import { assertJson, canonicalJson } from './util/canonical-json.js';
import { computeGeneric } from './generic/index.js';
import { computeGameModel } from './fgc2026/portable-game-models.js';
import { wildfire } from './fgc2026/wildfire.js';
import { climb } from './fgc2026/climb.js';
import { partnerClimb } from './fgc2026/partner-climb.js';
import { coopertition } from './fgc2026/coopertition.js';
import { scoreComposition } from './fgc2026/score-composition.js';
import { penalties } from './fgc2026/penalties.js';
import { live } from './fgc2026/live.js';
import { tournamentOperations } from './fgc2026/tournament-operations.js';
import { teamInterest } from './fgc2026/team-interest.js';
import { playoffs } from './fgc2026/playoffs.js';
import { crossCutting } from './fgc2026/cross-cutting.js';
import { auditTrail } from './fgc2026/audit-trail.js';
const qualifier = ['Qualification', 'Ranking'] as const,
  playoff = ['Round Robin', 'Eliminations', 'Finals'] as const;
const actionIds = new Set([
  'B11',
  'B12',
  'B13',
  'B14',
  'B15',
  'B16',
  'B19',
  'C16',
  'C17',
  'C18',
  'C19',
  'C20',
  'E12',
  'G13',
  'G14',
  'I6',
  'I9',
  'I10',
  ...Array.from({ length: 14 }, (_, i) => 'H' + (i + 1)),
  ...Array.from({ length: 27 }, (_, i) => 'M' + (i + 1))
]);
const historyIds = new Set([
  'B20',
  'E12',
  ...Array.from({ length: 14 }, (_, i) => 'H' + (i + 1)),
  ...Array.from({ length: 27 }, (_, i) => 'M' + (i + 1))
]);
const needsActions = new Set(
  'B11 B12 B13 B14 B15 B16 B19 C16 C17 C18 C19 C20 E12 G13 G14 H1 H2 H4 H5 H6 M8 M9 M10 M11 M12 M13 M14 M15 M16 M17 M18 M19 M20 M21 M23 M24 M26'.split(
    ' '
  )
);
const needsHistory = new Set(
  'B20 H1 H2 H14 M1 M2 M3 M4 M5 M6 M7 M14 M15 M16 M17 M18 M19 M22 M24 M25 M27'.split(
    ' '
  )
);
const qualificationIds = new Set([
  'A26',
  'A29',
  'A30',
  'A31',
  'A32',
  'A33',
  'H11',
  'H12',
  'J4',
  'J6',
  'L8',
  'L9',
  'L10',
  'L11'
]);
export const definitions: StatDefinition[] = catalogue.map((entry) => {
  const id = entry.catalogueId,
    section = id[0],
    n = Number(id.slice(1));
  const dependencies: StatDependency[] = ['matches', 'participants', 'teams'];
  if (entry.seasonKey) dependencies.push('details');
  if (actionIds.has(id)) dependencies.push('actions');
  if (historyIds.has(id)) dependencies.push('history');
  if (section === 'K' || section === 'J' || qualificationIds.has(id))
    dependencies.push('rankings', 'alliances');
  if (id === 'B17' || id === 'B18') dependencies.push('settings');
  const eventIds = new Set(
    'A20 B21 B22 C10 C12 C21 C22 D8 D9 E3 E4 E5 E13 F7 F8 F9 F10 F11 F12 F13 F14 G4 G6 G7 G8 G9 G10 G11 G12 H12 I2 I4 I6 I7 I8 I10 J4 J5 J6 J7 J8 J9 J10 J12 J15 L5 L6 L11 L13 M8 M9 M10 M11 M21 M22 M25'.split(
      ' '
    )
  );
  const teamIds = new Set(
    'C4 C5 C6 C7 C8 C11 C13 C16 C19 C20 D3 D4 E9 E10 E11 G5 J1 J2 J3 J11 J13 J14 L8 L9 L10 L12'.split(
      ' '
    )
  );
  const scope: StatDefinition['scope'] = eventIds.has(id)
    ? 'event'
    : section === 'K'
      ? 'alliance'
      : teamIds.has(id) ||
          (section === 'A' && ![16, 17, 18, 19, 21, 42].includes(n))
        ? 'team'
        : 'match';
  const defaultTournamentTypes =
    section === 'K'
      ? n === 11
        ? ['Finals' as const]
        : [...playoff]
      : qualificationIds.has(id)
        ? [...qualifier]
        : undefined;
  return {
    ...entry,
    seasonKey: entry.seasonKey ?? undefined,
    version: id === 'H7' ? 2 : 1,
    scope,
    units:
      id === 'H7'
        ? 'balls'
        : /(rate|share|probability|percent|efficiency)/i.test(entry.name)
          ? 'ratio'
          : /(time|latency|cadence|drought|split)/i.test(entry.name)
            ? 'seconds'
            : /(score|points|opr|epa|margin)/i.test(entry.name)
              ? 'points'
              : 'structured',
    precision: id === 'H7' ? 0 : 4,
    dependencies,
    supportedSelectors:
      scope === 'team'
        ? ['teamKey', 'teamsInMatchId', 'teamKeyList']
        : scope === 'alliance'
          ? ['allianceSeed']
          : scope === 'match'
            ? id === 'H11'
              ? ['matchId', 'teamKey']
              : ['matchId']
            : [],
    defaultTournamentTypes,
    allowedTournamentTypes: defaultTournamentTypes,
    qualityNotes: [
      ...(entry.family === 'REF'
        ? ['Referee entry timestamps are best-effort; no sensor attribution']
        : []),
      ...(section === 'A'
        ? ['Model definitions and constants: docs/fgc2026-stats-formulas.md']
        : [])
    ],
    paramsSchema: paramsFor(id),
    resultSchema: schemaFor(id),
    compute: async (ctx, rawParams, selectors) => {
      const p = commonParamsSchema.parse(paramsFor(id).parse(rawParams));
      if (
        selectors.teamKey !== undefined &&
        !ctx.teams.some((t) => t.teamKey === selectors.teamKey)
      )
        return notFound('Team does not exist in the event');
      if (
        selectors.matchId !== undefined &&
        !ctx.matches.some((m) => m.id === selectors.matchId)
      )
        return notFound('Match is absent or excluded by tournament filters');
      if (
        selectors.matchId !== undefined &&
        ctx.matches.filter((m) => m.id === selectors.matchId).length > 1
      )
        return unavailable(
          'Match ID is ambiguous across tournaments; specify tournamentKeys'
        );
      if (
        selectors.teamsInMatchId !== undefined &&
        !ctx.matches.some((m) => m.id === selectors.teamsInMatchId)
      )
        return notFound('Match is absent or excluded by tournament filters');
      if (
        selectors.teamsInMatchId !== undefined &&
        ctx.matches.filter((m) => m.id === selectors.teamsInMatchId).length > 1
      )
        return unavailable(
          'Match ID is ambiguous across tournaments; specify tournamentKeys'
        );
      if (
        selectors.teamKeyList !== undefined &&
        selectors.teamKeyList.some(
          (teamKey) => !ctx.teams.some((t) => t.teamKey === teamKey)
        )
      )
        return notFound('One or more teams do not exist in the event');
      let input = ctx;
      if (
        scope === 'match' &&
        !['A', 'H', 'I'].includes(section) &&
        selectors.matchId !== undefined
      )
        input = {
          ...ctx,
          matches: ctx.matches.filter((m) => m.id === selectors.matchId)
        };
      if (
        needsActions.has(id) &&
        !input.actions.some((a) =>
          input.matches.some(
            (m) => m.tournamentKey === a.tournamentKey && m.id === a.id
          )
        )
      )
        return unavailable(
          'No action events were captured for the selected matches'
        );
      if (
        needsHistory.has(id) &&
        !input.history.some((a) =>
          input.matches.some(
            (m) => m.tournamentKey === a.tournamentKey && m.id === a.id
          )
        )
      )
        return unavailable(
          'No revision history was captured for the selected matches'
        );
      let result: StatResult;
      switch (section) {
        case 'A':
          result = entry.seasonKey
            ? computeGameModel(n, input, p, selectors)
            : computeGeneric(n, input, p, selectors);
          break;
        case 'B':
          result = wildfire(n, input, p);
          break;
        case 'C':
          result = climb(n, input, p, selectors);
          break;
        case 'D':
          result = partnerClimb(n, input, p, selectors);
          break;
        case 'E':
          result = coopertition(n, input, p, selectors);
          break;
        case 'F':
          result = scoreComposition(n, input, p);
          break;
        case 'G':
          result = penalties(n, input, p, selectors);
          break;
        case 'H':
          result = live(n, input, p, selectors);
          break;
        case 'I':
          result = tournamentOperations(n, input, p);
          break;
        case 'J':
          result = teamInterest(n, input, p, selectors);
          break;
        case 'K':
          result = playoffs(n, input, p, selectors);
          break;
        case 'L':
          result = crossCutting(n, input, p, selectors);
          break;
        case 'M':
          result = auditTrail(n, input, p);
          break;
        default:
          throw new Error('Unknown catalogue section');
      }
      if (
        result.status === 'ok' &&
        Array.isArray(result.data) &&
        selectors.matchId !== undefined &&
        ['H', 'I'].includes(section) &&
        scope === 'match'
      ) {
        result.data = result.data.filter(
          (r) =>
            r &&
            typeof r === 'object' &&
            !Array.isArray(r) &&
            r.matchId === selectors.matchId
        );
      }
      assertJson(result);
      if (result.status === 'ok') {
        if (
          result.data === null ||
          (Array.isArray(result.data) &&
            result.data.length > 0 &&
            result.data.every(
              (r) =>
                r &&
                typeof r === 'object' &&
                !Array.isArray(r) &&
                'status' in r &&
                r.status !== 'ok'
            ))
        )
          return insufficient(
            'Required observations are missing or the denominator/sample is insufficient'
          );
        if (
          Array.isArray(result.data) &&
          result.data.length &&
          result.data.every(
            (r) =>
              r &&
              typeof r === 'object' &&
              !Array.isArray(r) &&
              'value' in r &&
              r.value === null
          )
        )
          return unavailable(
            id === 'B17' || id === 'B18'
              ? 'Per-field wildfireBallsPerLed is not recorded for these matches'
              : id === 'H7'
                ? 'No strict lead is possible within legal capacity, or scoring data is incomplete/invalid, for every selected match'
                : id === 'M15'
                  ? 'No complete base/detail snapshot exists at or before atUtc'
                  : 'Required captured data or sufficient samples are absent for every selected entity'
          );
        const reconciliationWarnings =
          needsActions.has(id) &&
          input.matches.some((m) =>
            reconciliation(input, m).some((r) => !r.matches)
          )
            ? [
                'Action replay does not reconcile with all authoritative terminal values'
              ]
            : [];
        result.warnings = [
          ...new Set([
            ...result.warnings,
            ...ctx.warnings,
            ...(entry.family === 'REF'
              ? [
                  'Referee timestamps describe best-effort input capture, not physical sensor observations'
                ]
              : []),
            ...(dependencies.includes('actions') &&
            input.matches.some(
              (m) =>
                !input.actions.some(
                  (a) =>
                    a.tournamentKey === m.tournamentKey &&
                    a.id === m.id &&
                    a.fieldPath === 'lifecycle'
                )
            )
              ? [
                  'Some selected matches lack lifecycle anchors; nominal-clock fallbacks and entry timing are best-effort'
                ]
              : []),
            ...reconciliationWarnings
          ])
        ];
        if (result.warnings.length) result.quality = 'best_effort';
      }
      return schemaFor(id).parse(result);
    }
  };
});
export function composeRegistry(entries: StatDefinition[]) {
  const slugs = new Set<string>(),
    ids = new Set<string>();
  for (const d of entries) {
    if (
      slugs.has(d.slug) ||
      ids.has((d.seasonKey ?? '*') + ':' + d.catalogueId)
    )
      throw new Error('Duplicate statistic registration: ' + d.slug);
    slugs.add(d.slug);
    ids.add((d.seasonKey ?? '*') + ':' + d.catalogueId);
  }
  return entries;
}
composeRegistry(definitions);
export const registryForSeason = (seasonKey: string) =>
  definitions.filter((d) => !d.seasonKey || d.seasonKey === seasonKey);
export function normalizeQuery(
  raw: unknown,
  definition: StatDefinition
): StatsQuery {
  const q = querySchema.parse(raw),
    params = definition.paramsSchema.parse(q.params);
  if (q.stat.trim().toLowerCase() !== definition.slug)
    throw new Error('Calculator slug mismatch');
  for (const selector of Object.keys(q.selectors)) {
    if (
      !definition.supportedSelectors.includes(
        selector as keyof StatsQuery['selectors']
      )
    )
      throw new Error('Unsupported selector for this calculator: ' + selector);
  }
  if (typeof params.atUtc === 'string')
    params.atUtc = new Date(params.atUtc).toISOString();
  const filters = { ...q.filters };
  for (const field of [
    'tournamentKeys',
    'tournamentTypes',
    'tournamentLevels'
  ] as const) {
    const value = filters[field];
    if (value?.length === 0)
      throw new Error('An explicit tournament filter must not be empty');
    if (value)
      (filters as any)[field] = [...new Set<string | number>(value)].sort(
        (a: any, b: any) => (typeof a === 'number' ? a - b : a.localeCompare(b))
      );
  }
  if (
    filters.tournamentTypes &&
    definition.allowedTournamentTypes &&
    filters.tournamentTypes.some(
      (t) => !definition.allowedTournamentTypes!.includes(t)
    )
  )
    throw new Error('Incompatible tournament type');
  if (!filters.tournamentTypes && definition.defaultTournamentTypes)
    filters.tournamentTypes = [...definition.defaultTournamentTypes].sort();
  const normalized = JSON.parse(
    JSON.stringify({ ...q, stat: definition.slug, filters, params })
  );
  return JSON.parse(canonicalJson(normalized));
}
export function catalogueMetadata(seasonKey: string) {
  return registryForSeason(seasonKey).map(
    ({ compute, paramsSchema, resultSchema, ...d }) => ({
      ...d,
      paramsSchema: z.toJSONSchema(paramsSchema),
      resultSchema: z.toJSONSchema(resultSchema),
      supportedFilters: [
        'tournamentKeys',
        'tournamentTypes',
        'tournamentLevels'
      ]
    })
  );
}
