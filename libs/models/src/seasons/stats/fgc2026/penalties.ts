import {
  type CalculatorContext,
  type StatParams,
  type StatsQuery,
  ok,
  insufficient,
  resolveTeamKeys
} from '../types.js';
import { gameMatches, identity, teamMatches } from './helpers.js';
import { matchActions, delta } from '../util/action-event-replay.js';
import { sum, ratio } from '../util/statistics.js';
export function penalties(
  id: number,
  ctx: CalculatorContext,
  p: StatParams,
  s: StatsQuery['selectors']
) {
  const games = gameMatches(ctx);
  if (!games.length) return insufficient();
  const side = p.alliance === 'red' ? 0 : 1,
    participants = games.flatMap((r) => r.m.participants ?? []),
    keys = resolveTeamKeys(ctx, s, () => ctx.teams.map((t) => t.teamKey));
  if ([6, 8, 9, 10, 11, 12].includes(id) && !participants.length)
    return insufficient('Match participants were not captured');
  if (id === 4)
    return ok(
      games
        .filter(
          ({ m, g }) =>
            Math.sign(Math.ceil(g.pre[0]) - Math.ceil(g.pre[1])) !==
            Math.sign(m.redScore - m.blueScore)
        )
        .map((r) => identity(r.m))
    );
  if (id === 5)
    return ok(
      keys.map((teamKey) => {
        const a = teamMatches(ctx, teamKey);
        return {
          teamKey,
          value: ratio(
            sum(
              a.map((m) =>
                m.participants!.find((p) => p.teamKey === teamKey)!.station < 20
                  ? m.redMinPen + m.redMajPen
                  : m.blueMinPen + m.blueMajPen
              )
            ),
            a.length
          )
        };
      }),
      ['Foul rate is alliance-attributed, not individual blame']
    );
  if (id === 6)
    return ok({
      yellow: participants.filter((p) => p.cardStatus === 1).length,
      red: participants.filter((p) => p.cardStatus === 2).length,
      white: participants.filter((p) => p.cardStatus === 3).length
    });
  if (id === 7) {
    const phases = new Set<string | null>(
      ctx.tournaments.map((t) =>
        ['Qualification', 'Ranking'].includes(t.tournamentType)
          ? 'qualification'
          : ['Round Robin', 'Eliminations', 'Finals'].includes(t.tournamentType)
            ? 'playoff'
            : null
      )
    );
    return ok(
      ctx.teams
        .filter((t) => t.hasCard && phases.has(t.cardPhase ?? null))
        .map((t) => ({
          teamKey: t.teamKey,
          cardStatus: t.cardStatus,
          cardPhase: t.cardPhase ?? null
        }))
    );
  }
  if (id === 8)
    return ok(
      ctx.tournaments.map((t) => ({
        tournamentKey: t.tournamentKey,
        tournamentType: t.tournamentType,
        cards: participants.filter(
          (p) => p.tournamentKey === t.tournamentKey && p.cardStatus > 0
        ).length
      }))
    );
  if (id === 9)
    return ok(
      participants.filter((p) => p.cardStatus === 3).length /
        participants.length
    );
  if (id === 10)
    return ok(
      participants
        .filter((p) => p.cardStatus === 2)
        .map((p) => ({
          teamKey: p.teamKey,
          tournamentKey: p.tournamentKey,
          matchId: p.id,
          excludedFromRanking: true
        }))
    );
  if (id === 11)
    return ok(participants.filter((p) => p.disqualified === 1).length);
  if (id === 12) return ok(participants.filter((p) => p.noShow > 0).length);
  return ok(
    games.map(({ m, g }) => {
      let value: any;
      switch (id) {
        case 1:
          value =
            side === 0
              ? { minor: m.redMinPen, major: m.redMajPen }
              : { minor: m.blueMinPen, major: m.blueMajPen };
          break;
        case 2:
          value = g.foul[side];
          break;
        case 3:
          value = ratio(g.foul[side], g.score[side]);
          break;
        case 13:
          value = matchActions(ctx, m)
            .filter((a) => a.sourceEvent === 'match:updateCardStatus')
            .map((a) => ({
              fieldPath: a.fieldPath ?? null,
              seconds: m.actualStartTime
                ? (Date.parse(a.occurredAtUtc) -
                    Date.parse(m.actualStartTime)) /
                  1000
                : null
            }));
          break;
        case 14:
          value = matchActions(ctx, m).filter(
            (a) =>
              /^(red|blue)(MinPen|MajPen)$/.test(a.fieldPath ?? '') &&
              (delta(a) ?? 0) < 0
          ).length;
          break;
        default:
          throw new Error('Unimplemented G' + id);
      }
      return { ...identity(m), value };
    })
  );
}
