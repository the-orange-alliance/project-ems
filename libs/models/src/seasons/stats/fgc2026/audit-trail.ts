import {
  type CalculatorContext,
  type StatParams,
  ok,
  insufficient,
  unavailable,
  keyOf
} from '../types.js';
import { identity, fields } from './helpers.js';
import {
  orderActions,
  matchActions,
  cleanActions,
  delta,
  parseValue,
  endAt,
  replayAt,
  scoreCurve,
  reconciliation,
  braceTransitions
} from '../util/action-event-replay.js';
import { sum, mean, median, ratio } from '../util/statistics.js';
export function auditTrail(id: number, ctx: CalculatorContext, p: StatParams) {
  if (!ctx.matches.length) return insufficient();
  const side = p.alliance === 'red' ? 'redScore' : 'blueScore',
    allActions = orderActions(ctx.actions);
  if (id === 22) {
    const recognized = [
        'realtime',
        'referee',
        'field-ui',
        'scorekeeper',
        'scorekeeper-ui',
        'admin',
        'direct-api'
      ],
      rows = ctx.history.filter((a) => recognized.includes(a.source ?? '')),
      sources = new Set(rows.map((a) => a.source));
    if (
      sources.size < 2 ||
      !rows.some((a) =>
        ['realtime', 'referee', 'field-ui'].includes(a.source!)
      ) ||
      !rows.some((a) =>
        ['scorekeeper', 'scorekeeper-ui', 'admin', 'direct-api'].includes(
          a.source!
        )
      )
    )
      return unavailable(
        'M22 requires distinct originating sources; api/null/unknown/legacy cannot distinguish overrides until issue #292 provenance is captured'
      );
    return ok(
      {
        rate:
          rows.filter(
            (a) =>
              a.actionType === 'MATCH_PATCH' &&
              !['realtime', 'referee', 'field-ui'].includes(a.source!)
          ).length / rows.length,
        recognizedRevisions: rows.length,
        unknownRevisions: ctx.history.length - rows.length
      },
      rows.length < ctx.history.length
        ? ['Unrecognized source rows excluded from override denominator']
        : []
    );
  }
  if (id === 25) {
    if (!ctx.history.length) return insufficient('No history snapshots');
    const post = ctx.history.filter((a) => {
      const m = ctx.matches.find((m) => keyOf(m) === keyOf(a)),
        end = m ? endAt(ctx, m) : null;
      return end && a.occurredAtUtc > end;
    });
    return ok(post.length / ctx.history.length, [
      'Audit capture is best-effort'
    ]);
  }
  if ([8, 9, 10, 11, 21, 23].includes(id) && !allActions.length)
    return unavailable('No captured action events');
  if (id === 8)
    return ok(
      Object.entries(
        Object.groupBy(allActions, (a) => a.actorId ?? 'unknown')
      ).map(([actorId, a]) => ({ actorId, entries: a!.length }))
    );
  if (id === 9) {
    const groups = Object.groupBy(
      cleanActions(allActions, { unitOnly: true, physicalOnly: true }),
      (a) => [keyOf(a), a.actorId ?? 'unknown', a.fieldPath].join('|')
    );
    return ok(
      Object.entries(groups).map(([group, a]) => ({
        group,
        medianSeconds: median(
          a!
            .slice(1)
            .map(
              (b, i) =>
                (Date.parse(b.occurredAtUtc) -
                  Date.parse(a![i].occurredAtUtc)) /
                1000
            )
        )
      })),
      [
        'Cadence includes only unit steps, within the same match, actor and field'
      ]
    );
  }
  if (id === 10)
    return ok(
      mean(
        cleanActions(allActions, { physicalOnly: true })
          .filter((a) => (a.fieldPath ?? '').includes('Suppression'))
          .flatMap((a) => (delta(a) === null ? [] : [Math.abs(delta(a)!)]))
      )
    );
  if (id === 11) {
    const a = allActions.filter(
      (a) =>
        (a.fieldPath ?? '').startsWith('details.') &&
        !a.fieldPath?.startsWith('details.approximate')
    );
    return a.length
      ? ok(a.filter((a) => (delta(a) ?? 0) < 0).length / a.length)
      : insufficient();
  }
  if (id === 21)
    return ok(
      Object.entries(
        Object.groupBy(allActions, (a) =>
          [
            ctx.matches.find((m) => keyOf(m) === keyOf(a))?.fieldNumber ??
              'unknown',
            a.clientId ?? 'unknown'
          ].join('|')
        )
      ).map(([fieldClient, a]) => ({ fieldClient, entries: a!.length }))
    );
  if (id === 23)
    return ok(
      ctx.matches.map((m) => ({
        ...identity(m),
        actors: [
          ...new Set(
            matchActions(ctx, m).flatMap((a) =>
              a.actorName ? [a.actorName] : []
            )
          )
        ]
      }))
    );
  const warnings = [
    'Action capture is best-effort; missing or late actions do not prove data loss'
  ];
  if (ctx.actions.some((a) => a.revision == null || !a.persisted))
    warnings.push(
      'Unassociated actions exist; late best-effort delivery may remain unpersisted'
    );
  if (!ctx.actions.some((a) => a.fieldPath === 'lifecycle'))
    warnings.push(
      'Lifecycle anchors absent; actualStartTime and nominal duration are fallback anchors'
    );
  return ok(
    ctx.matches.map((m) => {
      const actions = matchActions(ctx, m),
        history = orderActions(
          ctx.history.filter((a) => keyOf(a) === keyOf(m))
        ),
        details = orderActions(
          ctx.detailHistory.filter((a) => keyOf(a) === keyOf(m))
        ),
        end = endAt(ctx, m),
        post = history.filter((a) => end && a.occurredAtUtc > end),
        changes = history.slice(1).map((a, i) => ({
          a,
          change:
            typeof a[side] === 'number' && typeof history[i][side] === 'number'
              ? Number(a[side]) - Number(history[i][side])
              : null
        })),
        detailChanges: Record<string, number> = {};
      for (let i = 1; i < details.length; i++)
        for (const field of Object.keys(details[i]))
          if (
            ![
              'historyId',
              'revision',
              'occurredAtUtc',
              'correlationId',
              'actorId',
              'actorName',
              'clientId',
              'socketId',
              'actionType',
              'source'
            ].includes(field) &&
            JSON.stringify(details[i][field]) !==
              JSON.stringify(details[i - 1][field])
          )
            detailChanges[field] = (detailChanges[field] ?? 0) + 1;
      let value: any = null;
      switch (id) {
        case 1:
          value = history.length ? history.length : null;
          break;
        case 2:
          value = history.length && end ? post.length : null;
          break;
        case 3:
          value =
            post.length && changes.every((c) => c.change !== null)
              ? sum(
                  changes
                    .filter((c) => end && c.a.occurredAtUtc > end)
                    .map((c) => Math.abs(c.change!))
                )
              : null;
          break;
        case 4:
          value =
            post.length &&
            typeof post.at(-1)![side] === 'number' &&
            typeof post[0][side] === 'number'
              ? Number(post.at(-1)![side]) - Number(post[0][side])
              : null;
          break;
        case 5:
          value =
            details.length >= 2
              ? Object.entries(detailChanges)
                  .sort((a, b) => b[1] - a[1])
                  .map(([field, count]) => ({ field, count }))
              : null;
          break;
        case 6:
          value =
            history.length && m.actualStartTime
              ? (Date.parse(history.at(-1)!.occurredAtUtc) -
                  Date.parse(m.actualStartTime)) /
                1000
              : null;
          break;
        case 7: {
          const last = changes
            .filter((c) => c.change !== null && c.change !== 0)
            .at(-1);
          value =
            last && end
              ? (Date.parse(last.a.occurredAtUtc) - Date.parse(end)) / 1000
              : null;
          break;
        }
        case 12:
          value = actions.length ? reconciliation(ctx, m) : null;
          break;
        case 13:
          value = actions.length
            ? {
                pending: actions.filter((a) => !a.persisted).length,
                unassociated: actions.filter((a) => a.revision == null).length,
                fields: Object.entries(
                  Object.groupBy(
                    actions.filter((a) => !a.persisted),
                    (a) => a.fieldPath ?? 'unknown'
                  )
                ).map(([field, a]) => ({ field, count: a!.length }))
              }
            : null;
          break;
        case 14: {
          const delays = actions.flatMap((a) => {
            const revision = history.find((h) =>
              a.revision != null
                ? h.revision === a.revision
                : !!a.correlationId && h.correlationId === a.correlationId
            );
            return revision
              ? [
                  {
                    actionEventId: a.actionEventId ?? null,
                    seconds:
                      (Date.parse(revision.occurredAtUtc) -
                        Date.parse(a.occurredAtUtc)) /
                      1000
                  }
                ]
              : [];
          });
          value = delays.length
            ? {
                entries: delays,
                meanSeconds: mean(delays.map((a) => a.seconds)),
                unassociated: actions.length - delays.length
              }
            : null;
          break;
        }
        case 15:
          value = p.atUtc ? replayAt(ctx, m, p.atUtc) : null;
          break;
        case 16:
        case 17:
        case 18:
        case 19: {
          const curve = scoreCurve(ctx, m);
          if (!curve) break;
          if (id === 16) value = curve;
          else if (id === 17)
            value = curve.map((r) => ({ second: r.second, margin: r.margin }));
          else if (id === 18) {
            let prior = 0,
              count = 0;
            for (const r of curve) {
              const sign = Math.sign(r.margin);
              if (sign && prior && sign !== prior) count++;
              if (sign) prior = sign;
            }
            value = count;
          } else
            value =
              m.result === -1 || m.redScore === m.blueScore
                ? null
                : Math.max(
                    0,
                    ...curve.map((r) =>
                      m.redScore > m.blueScore ? -r.margin : r.margin
                    )
                  );
          break;
        }
        case 20: {
          const a = actions.filter(
            (a) => a.fieldPath === 'details.wildfireInExtinguisher'
          );
          value = a.length
            ? a
                .slice(1)
                .filter(
                  (r, i) =>
                    !!r.actorId &&
                    !!a[i].actorId &&
                    r.actorId !== a[i].actorId &&
                    Date.parse(r.occurredAtUtc) -
                      Date.parse(a[i].occurredAtUtc) <=
                      p.windowSeconds * 1000
                ).length
            : null;
          break;
        }
        case 24: {
          const edits = actions.filter(
              (a) =>
                (a.fieldPath ?? '').startsWith('details.') &&
                !a.fieldPath?.startsWith('details.approximate')
            ),
            corrections = sum(
              changes
                .filter((c) => end && c.a.occurredAtUtc > end)
                .map((c) => Math.abs(c.change!))
            ),
            backout = ratio(
              edits.filter((a) => (delta(a) ?? 0) < 0).length,
              edits.length
            ),
            foulCorrections = actions.filter(
              (a) =>
                /^(red|blue)(MinPen|MajPen)$/.test(a.fieldPath ?? '') &&
                (delta(a) ?? 0) < 0
            ).length;
          value =
            history.length &&
            backout !== null &&
            changes.every((c) => c.change !== null)
              ? {
                  index:
                    history.length + corrections + backout + foulCorrections,
                  revisions: history.length,
                  absoluteScoreCorrection: corrections,
                  backoutRate: backout,
                  foulCorrections
                }
              : null;
          break;
        }
        case 26: {
          const transitions = braceTransitions(ctx, m);
          value =
            transitions.length &&
            transitions.some((r) => r.before !== null && r.after !== null)
              ? transitions
                  .filter(
                    (r) =>
                      r.before !== null &&
                      r.after !== null &&
                      r.after > r.before &&
                      r.after >= 4
                  )
                  .map((r) => ({
                    threshold: r.after!,
                    atUtc: r.action.occurredAtUtc,
                    seconds: m.actualStartTime
                      ? (Date.parse(r.action.occurredAtUtc) -
                          Date.parse(m.actualStartTime)) /
                        1000
                      : null
                  }))
              : null;
          break;
        }
        case 27:
          value = details.length
            ? details.map((a) => ({
                revision: a.revision ?? null,
                seconds: m.actualStartTime
                  ? (Date.parse(a.occurredAtUtc) -
                      Date.parse(m.actualStartTime)) /
                    1000
                  : null,
                red: a.redClimbMultiplier ?? null,
                blue: a.blueClimbMultiplier ?? null
              }))
            : null;
          break;
        default:
          throw new Error('Unimplemented M' + id);
      }
      return { ...identity(m), value };
    }),
    warnings
  );
}
