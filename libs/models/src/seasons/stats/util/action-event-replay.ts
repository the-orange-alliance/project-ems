import {
  type AuditRow,
  type CalculatorContext,
  type Json,
  type StatMatch,
  keyOf
} from '../types.js';
import {
  calculateScore,
  FGC26MatchDetailsZod
} from '../../FGC26_IgnitingInnovation.js';
export const parseValue = (s: string | null | undefined): Json | undefined => {
  try {
    return s == null ? undefined : JSON.parse(s);
  } catch {
    return undefined;
  }
};
export const orderActions = (rows: AuditRow[]) =>
  [...rows].sort(
    (a, b) =>
      a.occurredAtUtc.localeCompare(b.occurredAtUtc) ||
      (a.actionEventId ?? a.historyId ?? 0) -
        (b.actionEventId ?? b.historyId ?? 0)
  );
export const delta = (a: AuditRow) => {
  if (typeof a.deltaNumber === 'number' && Number.isFinite(a.deltaNumber))
    return a.deltaNumber;
  const old = parseValue(a.oldValueJson),
    value = parseValue(a.newValueJson);
  return typeof old === 'number' &&
    typeof value === 'number' &&
    Number.isFinite(value - old)
    ? value - old
    : null;
};
export function cleanActions(
  rows: AuditRow[],
  options: {
    physicalOnly?: boolean;
    unitOnly?: boolean;
    collapse?: boolean;
  } = {}
) {
  const sorted = orderActions(rows).filter(
    (a) =>
      !options.physicalOnly || /^details\.wildfireIn/.test(a.fieldPath ?? '')
  );
  const output: AuditRow[] = [];
  for (const action of sorted) {
    const a = { ...action },
      group = (r: AuditRow) =>
        [
          keyOf(r),
          r.fieldPath,
          r.actorId ?? '',
          r.clientId ?? '',
          r.socketId ?? ''
        ].join('|');
    const i = output.findLastIndex((r) => group(r) === group(a)),
      prev = output[i];
    if (
      options.collapse !== false &&
      prev &&
      Date.parse(a.occurredAtUtc) - Date.parse(prev.occurredAtUtc) <= 1000 &&
      parseValue(a.oldValueJson) === parseValue(prev.newValueJson) &&
      Math.abs(delta(a) ?? 0) > 1 &&
      String(parseValue(a.newValueJson)).startsWith(
        String(parseValue(prev.newValueJson))
      )
    ) {
      a.oldValueJson = prev.oldValueJson;
      a.deltaNumber = null;
      output.splice(i, 1);
    }
    output.push(a);
  }
  return options.unitOnly
    ? output.filter((a) => Math.abs(delta(a) ?? 0) === 1)
    : output;
}
export function matchActions(ctx: CalculatorContext, m: StatMatch) {
  return orderActions(ctx.actions.filter((a) => keyOf(a) === keyOf(m)));
}
export function clockAt(ctx: CalculatorContext, m: StatMatch, atUtc: string) {
  const anchors = matchActions(ctx, m).filter(
    (a) => a.fieldPath === 'lifecycle' && a.occurredAtUtc <= atUtc
  );
  const a = anchors.at(-1),
    value = a ? parseValue(a.newValueJson) : undefined;
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    typeof value.timeLeft === 'number' &&
    typeof value.modeTimeLeft === 'number' &&
    typeof value.inProgress === 'boolean'
  ) {
    const elapsed = value.inProgress
      ? Math.max(0, (Date.parse(atUtc) - Date.parse(a!.occurredAtUtc)) / 1000)
      : 0;
    return {
      ...value,
      timeLeft: Math.max(0, value.timeLeft - elapsed),
      modeTimeLeft: Math.max(0, value.modeTimeLeft - elapsed),
      anchorAtUtc: a!.occurredAtUtc,
      bestEffort: false
    };
  }
  if (!m.actualStartTime || !Number.isFinite(Date.parse(m.actualStartTime)))
    return null;
  const elapsed = Math.max(
    0,
    (Date.parse(atUtc) - Date.parse(m.actualStartTime)) / 1000
  );
  return {
    matchState: elapsed >= 150 ? 8 : 6,
    mode: elapsed >= 150 ? 4 : elapsed >= 120 ? 3 : 2,
    timeLeft: Math.max(0, 150 - elapsed),
    modeTimeLeft: Math.max(0, 150 - elapsed),
    inProgress: elapsed < 150,
    anchorAtUtc: m.actualStartTime,
    bestEffort: true
  };
}
export function endAt(ctx: CalculatorContext, m: StatMatch): string | null {
  const ended = matchActions(ctx, m)
    .filter(
      (a) => a.sourceEvent === 'timer:end' || a.sourceEvent === 'match:abort'
    )
    .at(-1);
  if (ended) return ended.occurredAtUtc;
  return m.actualStartTime && Number.isFinite(Date.parse(m.actualStartTime))
    ? new Date(Date.parse(m.actualStartTime) + 150000).toISOString()
    : null;
}
export function replayAt(
  ctx: CalculatorContext,
  m: StatMatch,
  atUtc: string,
  cleaned = false
) {
  const base = orderActions(
    ctx.history.filter((a) => keyOf(a) === keyOf(m) && a.occurredAtUtc <= atUtc)
  ).at(-1);
  const detail = orderActions(
    ctx.detailHistory.filter(
      (a) =>
        keyOf(a) === keyOf(m) &&
        a.occurredAtUtc <= atUtc &&
        a.revision === base?.revision
    )
  ).at(-1);
  if (
    !base ||
    !detail ||
    ['redMinPen', 'redMajPen', 'blueMinPen', 'blueMajPen'].some(
      (k) => typeof base[k] !== 'number'
    ) ||
    Object.keys(FGC26MatchDetailsZod.shape).some(
      (k) => detail[k] === undefined || detail[k] === null
    )
  )
    return null;
  const state: Record<string, unknown> = {
    ...base,
    details: { ...detail },
    participants: (m.participants ?? []).map((p) => ({ ...p }))
  };
  for (const a of (cleaned
    ? cleanActions(matchActions(ctx, m))
    : matchActions(ctx, m)
  ).filter((a) => a.occurredAtUtc <= atUtc)) {
    const path = a.fieldPath ?? '',
      threshold = path.startsWith('details.')
        ? detail.occurredAtUtc
        : base.occurredAtUtc;
    if (
      a.occurredAtUtc < threshold ||
      (a.revision != null &&
        a.revision <=
          Number((path.startsWith('details.') ? detail : base).revision))
    )
      continue;
    const v = parseValue(a.newValueJson);
    if (v === undefined) continue;
    if (/^details\.[a-zA-Z][a-zA-Z0-9]*$/.test(path))
      (state.details as Record<string, unknown>)[path.slice(8)] = v;
    else if (
      /^(red|blue)(MinPen|MajPen|Score)$/.test(path) ||
      ['result', 'actualStartTime'].includes(path)
    )
      state[path] = v;
    else {
      const hit = /^participants\.(\d+)\.cardStatus$/.exec(path);
      if (hit) {
        const p = (
          state.participants as { station: number; cardStatus: unknown }[]
        ).find((p) => p.station === Number(hit[1]));
        if (p) p.cardStatus = v;
      }
    }
  }
  const parsed = FGC26MatchDetailsZod.safeParse(state.details);
  if (!parsed.success) return null;
  state.details = parsed.data;
  const scores = calculateScore(
    state as unknown as Parameters<typeof calculateScore>[0]
  );
  return {
    match: {
      ...state,
      redScore: scores[0],
      blueScore: scores[1]
    } as unknown as StatMatch,
    clock: clockAt(ctx, m, atUtc)
  };
}
export function reconciliation(ctx: CalculatorContext, m: StatMatch) {
  const last = new Map<string, AuditRow>();
  for (const a of matchActions(ctx, m))
    if (a.fieldPath && !a.fieldPath.startsWith('details.approximate'))
      last.set(a.fieldPath, a);
  const checks: Array<{
    fieldPath: string;
    replayed: Json;
    authoritative: Json;
    matches: boolean;
  }> = [];
  for (const [fieldPath, a] of last) {
    let authoritative: unknown = fieldPath.startsWith('details.')
      ? m.details?.[fieldPath.slice(8)]
      : (m as unknown as Record<string, unknown>)[fieldPath];
    const hit = /^participants\.(\d+)\.cardStatus$/.exec(fieldPath);
    if (hit)
      authoritative = m.participants?.find(
        (p) => p.station === Number(hit[1])
      )?.cardStatus;
    const replayed = parseValue(a.newValueJson);
    if (authoritative === undefined || replayed === undefined) continue;
    checks.push({
      fieldPath,
      replayed,
      authoritative: authoritative as Json,
      matches: JSON.stringify(replayed) === JSON.stringify(authoritative)
    });
  }
  return checks;
}
export function scoreCurve(ctx: CalculatorContext, m: StatMatch) {
  if (!m.actualStartTime || !Number.isFinite(Date.parse(m.actualStartTime)))
    return null;
  const points: Array<{
    second: number;
    atUtc: string;
    red: number;
    blue: number;
    margin: number;
  }> = [];
  const end = endAt(ctx, m),
    duration = end
      ? Math.max(
          0,
          Math.min(
            3600,
            Math.floor((Date.parse(end) - Date.parse(m.actualStartTime)) / 1000)
          )
        )
      : 150;
  for (let second = 0; second <= duration; second++) {
    const atUtc = new Date(
        Date.parse(m.actualStartTime) + second * 1000
      ).toISOString(),
      r = replayAt(ctx, m, atUtc);
    if (!r) return null;
    points.push({
      second,
      atUtc,
      red: r.match.redScore,
      blue: r.match.blueScore,
      margin: r.match.redScore - r.match.blueScore
    });
  }
  return points;
}

/** Counts are known only when all six captured brace states are known. */
export function braceTransitions(ctx: CalculatorContext, m: StatMatch) {
  const fields = [
    'redRobotOne',
    'redRobotTwo',
    'redRobotThree',
    'blueRobotOne',
    'blueRobotTwo',
    'blueRobotThree'
  ].map((r) => r + 'BraceState');
  const actions = matchActions(ctx, m).filter((a) =>
    fields.some((f) => a.fieldPath === 'details.' + f)
  );
  const baseline = orderActions(
    ctx.detailHistory.filter(
      (r) =>
        keyOf(r) === keyOf(m) &&
        actions[0] &&
        r.occurredAtUtc <= actions[0].occurredAtUtc
    )
  ).at(-1);
  const states = fields.map((f) => {
    const first = actions.find((a) => a.fieldPath === 'details.' + f);
    const value =
      baseline?.[f] ?? (first ? parseValue(first.oldValueJson) : undefined);
    return typeof value === 'number' ? value : null;
  });
  const count = () =>
    states.every((v) => v !== null)
      ? states.filter((v) => v === 0.3).length
      : null;
  return actions.map((action) => {
    const before = count(),
      index = fields.findIndex((f) => action.fieldPath === 'details.' + f),
      value = parseValue(action.newValueJson);
    states[index] = typeof value === 'number' ? value : null;
    return { action, index, before, after: count() };
  });
}
