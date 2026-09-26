import { defaultTeam, defaultTournament } from '../../../base/index.js';
import {
  defaultMatchDetails,
  calculateScore,
  calculateRankingPoints
} from '../../FGC26_IgnitingInnovation.js';
import { type CalculatorContext, type StatMatch } from '../types.js';
export function fixture(): CalculatorContext {
  const eventKey = 'event-with-authoritative-season',
    ctx: CalculatorContext = {
      teamsPerAlliance: 3,
      eventKey,
      seasonKey: 'fgc_2026',
      calculatedAsOfUtc: '2026-09-01T15:00:00.000Z',
      queryHash: '1234567890abcdef'.repeat(4),
      tournaments: [
        ['q', 'Qualification', 2],
        ['r', 'Ranking', 30],
        ['p', 'Round Robin', 20],
        ['f', 'Finals', 400]
      ].map(([key, type, level]) => ({
        ...defaultTournament,
        eventKey,
        tournamentKey: String(key),
        tournamentType: type as any,
        tournamentLevel: Number(level)
      })),
      matches: [],
      teams: Array.from({ length: 8 }, (_, i) => ({
        ...defaultTeam,
        eventKey,
        teamKey: i + 1,
        teamNumber: String(i + 1),
        country: i % 2 ? 'Canada' : 'United States',
        countryCode: i % 2 ? 'CA' : 'US',
        robotName: 'Robot ' + (i + 1),
        rookieYear: i < 3 ? 2026 : 2025
      })),
      alliances: [],
      rankings: [],
      actions: [],
      history: [],
      detailHistory: [],
      settings: [
        { fieldNumber: 1, wildfireBallsPerLed: 2 },
        { fieldNumber: 2, wildfireBallsPerLed: 1 },
        { fieldNumber: 3, wildfireBallsPerLed: 2 }
      ],
      warnings: []
    };
  let actionId = 0,
    historyId = 0;
  for (const tournament of ctx.tournaments) {
    const count = tournament.tournamentKey === 'f' ? 2 : 4;
    if (['p', 'f'].includes(tournament.tournamentKey))
      for (let t = 1; t <= 8; t++)
        ctx.alliances.push({
          eventKey,
          tournamentKey: tournament.tournamentKey,
          allianceRank: t <= 4 ? 1 : 2,
          teamKey: t,
          allianceNameLong: 'Alliance ' + (t <= 4 ? 1 : 2),
          allianceNameShort: 'A',
          isCaptain: t === 1 || t === 5 ? 1 : 0,
          pickOrder: (t - 1) % 4
        });
    for (let i = 0; i < count; i++) {
      const index = ctx.matches.length,
        start = Date.parse('2026-09-01T12:00:00.000Z') + index * 300000,
        key = { eventKey, tournamentKey: tournament.tournamentKey, id: i + 1 },
        iso = (seconds: number) =>
          new Date(start + seconds * 1000).toISOString();
      const roster = [1, 2, 3, 4]
        .filter((_, j) => j !== i % 4)
        .concat([5, 6, 7, 8].filter((_, j) => j !== (i + 1) % 4));
      const details = calculateRankingPoints({
        ...defaultMatchDetails,
        ...key,
        wildfireInRedSuppressionUnit: 100 + index * 4,
        wildfireInBlueSuppressionUnit: 70 + index * 3,
        wildfireInExtinguisher: 40 + index,
        redRobotOneBraceState: 0.3,
        redRobotTwoBraceState: 0.3,
        redRobotThreeBraceState: 0.3,
        blueRobotOneBraceState: 0.3,
        blueRobotTwoBraceState: 0.1,
        blueRobotThreeBraceState: 0,
        blueRobotThreePartnerClimb: true,
        approximateWildfireInRedSuppressionUnit: 50 + index * 2,
        approximateWildfireInBlueSuppressionUnit: 35,
        approximateWildfireInExtinguisher: 20
      });
      const m: StatMatch = {
        ...key,
        name: tournament.tournamentKey.toUpperCase() + (i + 1),
        scheduledTime: iso(-10),
        prestartTime: iso(-20),
        actualStartTime: iso(0),
        fieldNumber: (index % 3) + 1,
        cycleTime: 300,
        redScore: 0,
        blueScore: 0,
        redMinPen: index % 2,
        redMajPen: 0,
        blueMinPen: 0,
        blueMajPen: 0,
        active: 0,
        result: 1,
        uploaded: 0,
        updatedAtUtc: iso(160),
        details,
        participants: roster.map((teamKey, j) => ({
          ...key,
          teamKey,
          station: [11, 12, 13, 21, 22, 23][j],
          disqualified: 0,
          cardStatus: 0,
          surrogate: 0,
          noShow: 0
        }))
      };
      [m.redScore, m.blueScore] = calculateScore({ ...m, details });
      ctx.matches.push(m);
      for (const [revision, at, initial, source] of [
        [1, -25, true, 'realtime'],
        [2, 155, false, 'scorekeeper'],
        [3, 160, false, 'scorekeeper']
      ] as const) {
        const envelope = {
          ...key,
          revision,
          historyId: ++historyId,
          occurredAtUtc: iso(at),
          source,
          actionType: 'MATCH_PATCH',
          correlationId: 'c' + historyId
        };
        const { details: ignore, participants: alsoIgnore, ...base } = m;
        ctx.history.push({
          ...base,
          ...(initial ? { redScore: 0, blueScore: 0, result: -1 } : {}),
          ...envelope
        });
        ctx.detailHistory.push({
          ...(initial ? { ...defaultMatchDetails, ...key } : details),
          ...envelope
        });
      }
      const action = (
        at: number,
        fieldPath: string,
        old: unknown,
        value: unknown,
        actorId = 'ref-1',
        sourceEvent = 'match:updateDetailsItem'
      ) =>
        ctx.actions.push({
          ...key,
          actionEventId: ++actionId,
          revision: 2,
          persisted: 1,
          sourceEvent,
          fieldPath,
          oldValueJson: JSON.stringify(old),
          newValueJson: JSON.stringify(value),
          deltaNumber: null,
          actorId,
          actorName: actorId,
          clientId: 'tablet-' + actorId,
          socketId: 'socket-' + actorId,
          occurredAtUtc: iso(at)
        });
      action(
        -20,
        'lifecycle',
        { matchState: 0 },
        {
          matchState: 2,
          mode: 0,
          timeLeft: 150,
          modeTimeLeft: 150,
          inProgress: false
        },
        'operator',
        'match:prestart'
      );
      action(
        0,
        'lifecycle',
        { matchState: 2 },
        {
          matchState: 6,
          mode: 2,
          timeLeft: 150,
          modeTimeLeft: 150,
          inProgress: true
        },
        'operator',
        'timer:start'
      );
      action(1, 'details.wildfireInRedSuppressionUnit', 0, 1);
      action(1.2, 'details.wildfireInRedSuppressionUnit', 1, 15);
      action(1.4, 'details.wildfireInRedSuppressionUnit', 15, 150);
      action(2, 'details.approximateWildfireInRedSuppressionUnit', 0, 75);
      action(10, 'details.wildfireInRedSuppressionUnit', 150, 151);
      action(20, 'details.wildfireInRedSuppressionUnit', 151, 152);
      action(25, 'details.wildfireInBlueSuppressionUnit', 0, 1, 'ref-2');
      action(40, 'details.wildfireInBlueSuppressionUnit', 1, 2, 'ref-2');
      action(60, 'details.wildfireInExtinguisher', 0, 10);
      action(60.2, 'details.wildfireInExtinguisher', 10, 20, 'ref-2');
      const names = [
        'redRobotOne',
        'redRobotTwo',
        'redRobotThree',
        'blueRobotOne',
        'blueRobotTwo',
        'blueRobotThree'
      ] as const;
      names.forEach((name, j) =>
        action(
          120 + j,
          'details.' + name + 'BraceState',
          0,
          details[(name + 'BraceState') as keyof typeof details]
        )
      );
      action(126, 'details.blueRobotThreePartnerClimb', false, true, 'ref-2');
      for (const field of [
        'wildfireInRedSuppressionUnit',
        'wildfireInBlueSuppressionUnit',
        'wildfireInExtinguisher'
      ] as const)
        action(
          140,
          'details.' + field,
          field.includes('Red') ? 152 : field.includes('Blue') ? 2 : 20,
          details[field]
        );
      action(
        145,
        'redMinPen',
        0,
        m.redMinPen,
        'scorekeeper',
        'match:updateItem'
      );
      action(
        150,
        'lifecycle',
        { matchState: 6 },
        {
          matchState: 8,
          mode: 4,
          timeLeft: 0,
          modeTimeLeft: 0,
          inProgress: false
        },
        'operator',
        'timer:end'
      );
      action(
        155,
        'lifecycle',
        { matchState: 8 },
        {
          matchState: 10,
          mode: 4,
          timeLeft: 0,
          modeTimeLeft: 0,
          inProgress: false
        },
        'operator',
        'match:commit'
      );
    }
  }
  for (let t = 1; t <= 8; t++)
    ctx.rankings.push({
      eventKey,
      tournamentKey: 'q',
      teamKey: t,
      rankingScore: 300 - t,
      rank: t,
      rankChange: 0,
      highestScore: 400,
      climbPoints: 0.3,
      played: 4
    });
  return ctx;
}
