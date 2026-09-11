import { AsyncDatabase } from 'promised-sqlite3';
import sqlite3 from 'sqlite3';
import { z } from 'zod';
import {
  matchZod,
  matchParticipantZod,
  tournamentDatabaseZod,
  teamZod,
  allianceMemberZod
} from '@toa-lib/models/base';
import { FGC26MatchDetailsZod } from '@toa-lib/models/seasons/stats';
import {
  type StatsQuery,
  type CalculatorContext,
  type StatDefinition,
  type SourceMarker,
  type AuditRow,
  type Json,
  type StatMatch,
  keyOf
} from '@toa-lib/models/seasons/stats';
export interface StatsWork {
  query: StatsQuery;
  queryHash: string;
  seasonKey: string;
  calculatorVersion: number;
  eventDatabasePath: string;
  globalDatabasePath: string;
}
export function tournamentSelection(q: StatsQuery) {
  const where = ['eventKey = ?'],
    values: unknown[] = [q.eventKey];
  for (const [field, column] of [
    ['tournamentKeys', 'tournamentKey'],
    ['tournamentTypes', 'tournamentType'],
    ['tournamentLevels', 'tournamentLevel']
  ] as const) {
    const a = q.filters[field];
    if (a) {
      where.push(column + ' IN (' + a.map(() => '?').join(',') + ')');
      values.push(...a);
    }
  }
  return { sql: where.join(' AND '), values };
}
export async function readSourceMarker(
  db: AsyncDatabase,
  q: StatsQuery
): Promise<SourceMarker> {
  const selection = tournamentSelection(q);
  // Each correlated lookup seeks the newest row in one selected tournament's
  // covering index. This avoids auditing all action rows on a cache hit.
  const query = async (table: string, column: string) => {
    try {
      const [row] = await db.all<Record<string, Json>>(
        `SELECT MAX((SELECT "${column}" FROM "${table}" source WHERE source.eventKey=t.eventKey AND source.tournamentKey=t.tournamentKey ORDER BY "${column}" DESC LIMIT 1)) AS value FROM tournament t WHERE ${selection.sql}`,
        selection.values
      );
      return row?.value ?? null;
    } catch (e) {
      if (String(e).includes('no such table')) return null;
      throw e;
    }
  };
  return {
    latestMatchUpdatedAtUtc: (await query('match', 'updatedAtUtc')) as
      string | null,
    latestHistoryId: (await query('match_history_base', 'historyId')) as
      number | null,
    latestActionEventId: (await query(
      'match_action_event',
      'actionEventId'
    )) as number | null
  };
}
const auditSchema = z
  .object({
    eventKey: z.string(),
    tournamentKey: z.string(),
    id: z.number().int(),
    occurredAtUtc: z.iso.datetime({ offset: true })
  })
  .passthrough();
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}
export async function loadSnapshot(
  work: StatsWork,
  definition: StatDefinition
) {
  const db = await AsyncDatabase.open(
      work.eventDatabasePath,
      sqlite3.OPEN_READONLY
    ),
    warnings: string[] = [];
  const ctx: CalculatorContext = {
    teamsPerAlliance: work.seasonKey === 'fgc_2026' ? 3 : undefined,
    eventKey: work.query.eventKey,
    seasonKey: work.seasonKey,
    calculatedAsOfUtc: '',
    queryHash: work.queryHash,
    tournaments: [],
    matches: [],
    teams: [],
    alliances: [],
    rankings: [],
    actions: [],
    history: [],
    detailHistory: [],
    settings: [],
    warnings
  };
  const validate = <T>(
    schema: z.ZodType<T>,
    rows: unknown[],
    label: string
  ): T[] =>
    rows.flatMap((row) => {
      const parsed = schema.safeParse(row);
      if (!parsed.success) {
        warnings.push('Invalid ' + label + ' row excluded');
        return [];
      }
      return [parsed.data];
    });
  let sourceMarker: SourceMarker,
    latestPlayedMatch: any = null;
  try {
    await db.exec('PRAGMA query_only=ON; PRAGMA busy_timeout=5000; BEGIN');
    const selection = tournamentSelection(work.query);
    if (
      definition.allowedTournamentTypes &&
      (work.query.filters.tournamentKeys || work.query.filters.tournamentLevels)
    ) {
      const requested = tournamentSelection({
        ...work.query,
        filters: { ...work.query.filters, tournamentTypes: undefined }
      });
      const candidates = await db.all<{ tournamentType: string }>(
        'SELECT tournamentType FROM tournament WHERE ' + requested.sql,
        requested.values
      );
      if (
        candidates.some(
          (t) =>
            !definition.allowedTournamentTypes!.includes(
              t.tournamentType as any
            )
        )
      )
        throw Object.assign(
          new Error(
            'Explicit tournament key/level filter includes an incompatible phase'
          ),
          { statusCode: 400 }
        );
    }
    ctx.tournaments = validate(
      tournamentDatabaseZod,
      await db.all(
        'SELECT * FROM tournament WHERE ' + selection.sql,
        selection.values
      ),
      'tournament'
    );
    if (
      definition.allowedTournamentTypes &&
      ctx.tournaments.some(
        (t) => !definition.allowedTournamentTypes!.includes(t.tournamentType)
      )
    )
      throw new Error('Incompatible tournament type');
    ctx.calculatedAsOfUtc = new Date().toISOString();
    const keys = ctx.tournaments.map((t) => t.tournamentKey),
      where =
        'eventKey = ? AND tournamentKey IN (' +
        keys.map(() => '?').join(',') +
        ')',
      values = [ctx.eventKey, ...keys];
    const read = async (table: string) =>
      keys.length
        ? await db.all<Record<string, Json>>(
            'SELECT * FROM "' + table + '" WHERE ' + where,
            values
          )
        : [];
    ctx.matches = validate(
      matchZod,
      await read('match'),
      'match'
    ) as StatMatch[];
    ctx.teams = validate(
      teamZod,
      await db.all('SELECT * FROM team WHERE eventKey = ?', [ctx.eventKey]),
      'team'
    );
    if (definition.dependencies.includes('participants')) {
      const participants = validate(
        matchParticipantZod,
        await read('match_participant'),
        'participant'
      );
      for (const m of ctx.matches)
        m.participants = participants.filter((p) => keyOf(p) === keyOf(m));
    }
    if (definition.dependencies.includes('details')) {
      const rows = await read('match_detail');
      for (const row of rows) {
        const m = ctx.matches.find((m) => keyOf(m) === keyOf(row as any));
        if (!m) continue;
        const normalized = { ...row };
        for (const k of Object.keys(normalized))
          if (
            k.endsWith('PartnerClimb') &&
            (normalized[k] === 0 || normalized[k] === 1)
          )
            normalized[k] = Boolean(normalized[k]);
        const required = Object.keys(FGC26MatchDetailsZod.shape);
        if (
          required.some(
            (k) => normalized[k] === undefined || normalized[k] === null
          )
        ) {
          warnings.push('Incomplete FGC2026 details for ' + keyOf(m));
          continue;
        }
        const parsed = FGC26MatchDetailsZod.safeParse(normalized);
        if (parsed.success) m.details = parsed.data;
        else warnings.push('Invalid FGC2026 details for ' + keyOf(m));
      }
    }
    if (definition.dependencies.includes('alliances'))
      ctx.alliances = validate(
        allianceMemberZod,
        await read('alliance'),
        'alliance'
      );
    if (definition.dependencies.includes('rankings'))
      ctx.rankings = definition.catalogueId.startsWith('K')
        ? await db.all<Record<string, Json>>(
            `SELECT r.* FROM ranking r JOIN tournament t ON r.eventKey=t.eventKey AND r.tournamentKey=t.tournamentKey WHERE r.eventKey = ? AND t.tournamentType IN ('Qualification','Ranking')`,
            [ctx.eventKey]
          )
        : await read('ranking');
    for (const [dependency, table, property] of [
      ['actions', 'match_action_event', 'actions'],
      ['history', 'match_history_base', 'history'],
      ['history', 'match_detail_history', 'detailHistory']
    ] as const) {
      if (!definition.dependencies.includes(dependency)) continue;
      try {
        ctx[property] = validate(
          auditSchema,
          await read(table),
          table
        ) as AuditRow[];
        if (property === 'detailHistory')
          for (const row of ctx[property])
            for (const k of Object.keys(row))
              if (k.endsWith('PartnerClimb') && (row[k] === 0 || row[k] === 1))
                row[k] = Boolean(row[k]);
      } catch (e) {
        if (String(e).includes('no such table'))
          warnings.push('Audit tables absent; recreate this development event');
        else throw e;
      }
    }
    sourceMarker = await readSourceMarker(db, work.query);
    const latest = ctx.matches
      .filter(
        (m) =>
          m.result !== -1 &&
          m.actualStartTime &&
          Number.isFinite(Date.parse(m.actualStartTime))
      )
      .sort(
        (a, b) =>
          Date.parse(b.actualStartTime) - Date.parse(a.actualStartTime) ||
          b.tournamentKey.localeCompare(a.tournamentKey) ||
          b.id - a.id
      )[0];
    if (latest)
      latestPlayedMatch = {
        eventKey: latest.eventKey,
        tournamentKey: latest.tournamentKey,
        id: latest.id,
        name: latest.name,
        actualStartTime: latest.actualStartTime,
        updatedAtUtc: latest.updatedAtUtc ?? null
      };
    await db.exec('COMMIT');
  } catch (e) {
    await db.exec('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    await db.close();
  }
  if (definition.dependencies.includes('settings')) {
    const global = await AsyncDatabase.open(
      work.globalDatabasePath,
      sqlite3.OPEN_READONLY
    );
    try {
      const rows = await global.all<{ field: string; data: string }>(
        'SELECT field,data FROM fcs_settings'
      );
      ctx.settings = rows.flatMap((r) => {
        try {
          const data = JSON.parse(r.data);
          return typeof data.wildfireBallsPerLed === 'number'
            ? [
                {
                  fieldNumber: Number(r.field),
                  wildfireBallsPerLed: data.wildfireBallsPerLed
                }
              ]
            : [];
        } catch {
          return [];
        }
      });
      warnings.push(
        'Field settings are current global configuration, not historical match provenance'
      );
    } finally {
      await global.close();
    }
  }
  return {
    ctx: freeze(ctx),
    sourceMarker: sourceMarker!,
    latestPlayedMatch,
    selectedTournamentKeys: ctx.tournaments.map((t) => t.tournamentKey).sort()
  };
}
