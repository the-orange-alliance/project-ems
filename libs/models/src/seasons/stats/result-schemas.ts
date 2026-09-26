import { z } from 'zod';
import {
  jsonSchema,
  failureSchema,
  type Json,
  type StatResult
} from './types.js';
const n = z.number(),
  s = z.string(),
  b = z.boolean(),
  nullable = n.nullable(),
  numbers = z.array(n),
  strings = z.array(s);
const object = (shape: Record<string, z.ZodType>) => z.object(shape).strict();
const array = (schema: z.ZodType) => z.array(schema);
const match = { eventKey: s, tournamentKey: s, matchId: n };
const matchRows = (value: z.ZodType) =>
  array(object({ ...match, value: value.nullable() }));
const teamRows = (value: z.ZodType) =>
  array(object({ teamKey: n, value: value.nullable() }));
const histogram = object({
  bins: numbers,
  counts: numbers,
  below: n,
  above: n
});
const rank = object({
  teamKey: n,
  rankingScore: n,
  highestScore: n,
  climbPoints: n,
  rank: n,
  rankChange: n,
  played: n
});
const data: Record<string, z.ZodType> = {};
const put = (ids: string, schema: z.ZodType) => {
  for (const id of ids.split(' ')) data[id] = schema;
};
put(
  'A1 A2 A3 A4 A5 A6 A7 A8 A9',
  object({
    teams: array(object({ teamKey: n, value: nullable })),
    rank: n,
    columns: n
  })
);
put(
  'A10 A12 A13 A22 A24 A25 A26 A28 A29 A31 A32 A33 A35 A37 A39 A40 A41',
  teamRows(n)
);
put('A14', teamRows(object({ peak: n, delta: n })));
put('A15', teamRows(object({ mu: n, sigma: n })));
put('A11', teamRows(object({ suppression: n, climb: n, partner: n })));
const predictionFailure = object({
  tournamentKey: s,
  matchId: n,
  status: z.enum(['unavailable', 'insufficient_data']),
  reason: s
});
put(
  'A16 A18 A42',
  array(
    z.union([
      predictionFailure,
      object({ tournamentKey: s, matchId: n, value: n })
    ])
  )
);
put(
  'A17',
  array(object({ tournamentKey: s, matchId: n, value: array(nullable) }))
);
put(
  'A19',
  array(
    z.union([
      predictionFailure,
      object({
        tournamentKey: s,
        matchId: n,
        value: object({
          red: array(nullable),
          blue: array(nullable),
          samples: n,
          seed: n
        })
      })
    ])
  )
);
put('A20 B21 B22 C10 C21 D9 E3 E4 E5 E13 F10 G9 G11 G12 I2 I10 M10 M11 M25', n);
put('A21', array(object({ matchKey: s, value: n })));
put('A23', teamRows(object({ floor: n, ceiling: n })));
put('A27', teamRows(object({ wins: n, losses: n, ties: n, played: n })));
put('A30', teamRows(object({ rank: n, rankChange: n })));
put('A34', teamRows(object({ average: nullable, median: nullable })));
put('A36', teamRows(object({ played: n, surrogate: n })));
put('A38', teamRows(object({ wins: n, losses: n, ties: n })));
put(
  'B1 B2 B3 B4 B5 B6 B7 B8 B9 B10 B11 B12 B15 B18 B20 C2 C3 C14 C15 C17 C18 C22 D1 D2 D7 E1 E2 E6 E7 E8 F3 F4 F15 F16 F17 G2 G3 G14 H1 H3 H4 H7 H8 H9 H10 H13 I1 I3 I4 I5 I6 I9 M1 M2 M3 M4 M6 M7 M18 M19 M20',
  matchRows(n)
);
put('B13', matchRows(array(object({ milestone: n, seconds: nullable }))));
put(
  'B14',
  matchRows(
    object({
      points: array(object({ seconds: nullable, count: jsonSchema })),
      skew: nullable
    })
  )
);
put('B16', matchRows(array(object({ actor: s, entries: n, netEntered: n }))));
put('B17', matchRows(object({ red: n, blue: n, extinguisher: n })));
put('B19', matchRows(object({ steps: n, typed: n, stepShare: nullable })));
put('C1', matchRows(array(object({ station: s, brace: n }))));
put('C4 C6 C7 C8 D3 E9 G5', teamRows(n));
put('C5', teamRows(array(object({ brace: n, count: n }))));
put('C9 D5 D6 E12', matchRows(b));
put('C11 C13', teamRows(array(object({ ...match, value: n }))));
put('C12', object({ teamKey: n, ...match, value: n }));
put('C16 C20', teamRows(array(object({ ...match, value: nullable }))));
put(
  'C19',
  teamRows(
    array(
      object({
        ...match,
        value: array(object({ atUtc: s, from: jsonSchema, to: jsonSchema }))
      })
    )
  )
);
const carrier = {
  teamKey: n,
  rate: nullable,
  identifiedMatches: n,
  ambiguousMatches: n
};
put('D4', array(object(carrier)));
put('D8', object(carrier));
put('E10 E11', teamRows(array(object({ ...match, value: b }))));
const slices = {
  suppression: n,
  partner: n,
  extinguisher: n,
  coopertition: n,
  fouls: n
};
put('F1 F2', matchRows(object(slices)));
put(
  'F5',
  matchRows(object({ red: n, blue: n, resultChanged: b, penaltiesExcluded: b }))
);
put('F6 L3 L4', matchRows(object({ red: n, blue: n, resultChanged: b })));
put('F7', object({ highest: n, lowest: n }));
put('F8 F9', histogram);
put(
  'F11',
  object({
    closest: object({ ...match, margin: n }),
    widest: object({ ...match, margin: n })
  })
);
put('F12', array(object({ ...match, index: n, meanScore: nullable })));
put('F13', array(object({ ...match, score: n, atUtc: s })));
put('F14', object({ points: n, penaltiesExcluded: b, feasibility: s }));
put('G1', matchRows(object({ minor: n, major: n })));
put('G4', array(object(match)));
put('G6', object({ yellow: n, red: n, white: n }));
put(
  'G7',
  array(object({ teamKey: n, cardStatus: n, cardPhase: s.nullable() }))
);
put('G8', array(object({ tournamentKey: s, tournamentType: s, cards: n })));
put(
  'G10',
  array(
    object({ teamKey: n, tournamentKey: s, matchId: n, excludedFromRanking: b })
  )
);
put(
  'G13',
  matchRows(array(object({ fieldPath: s.nullable(), seconds: nullable })))
);
put('H2', matchRows(object({ projected: n, expectedEndgame: n })));
put('H5', matchRows(object({ alliance: s, entries: n })));
put('H6', matchRows(array(object({ fromSeconds: n, toSeconds: n, balls: n }))));
put('H11', matchRows(array(object({ teamKey: n, balls: nullable }))));
put(
  'H12',
  array(
    object({
      eventKey: s,
      tournamentKey: s,
      teamKey: n,
      climbPoints: n,
      losses: n,
      played: n,
      rank: n,
      rankChange: n,
      rankingScore: n,
      ties: n,
      wins: n,
      highestScore: n
    })
  )
);
put('H14', matchRows(object({ worst: n, best: n, suppressionFrozen: n })));
put('I7', object({ played: n, remaining: n }));
put('I8', array(object({ fieldNumber: n, meanScore: nullable, matches: n })));
put(
  'J1',
  array(
    object({ teamKey: n, country: s.nullable(), countryCode: s.nullable() })
  )
);
put('J2', array(object({ teamKey: n, robotName: s.nullable() })));
put('J3', array(object({ teamKey: n, rookie: b.nullable() })));
put('J4', rank);
put('J5', object({ teamKey: n, ...match, score: n }));
put(
  'J6',
  object({
    countries: array(object({ country: s, meanRankingScore: nullable })),
    continents: array(object({ continent: s, meanRankingScore: nullable }))
  })
);
put('J7', object({ countries: strings, wins: n, losses: n, ties: n }));
put('J8 J9', array(object({ teamKey: n })));
put('J10', object({ teamKey: n, slope: nullable }));
put(
  'J11',
  array(
    object({ teamKey: n, partners: array(object({ teamKey: n, count: n })) })
  )
);
put('J12', array(object({ teamKeys: numbers })));
const superMatch = object({ ...match, name: s, score: n }).nullable();
put('J13', array(object({ teamKey: n, worst: superMatch, best: superMatch })));
put('J14', array(object({ teamKey: n, wins: n })));
const country = object({ teamKey: n, country: s, latitude: n, area: n });
put(
  'J15',
  object({
    northernmost: country,
    southernmost: country,
    smallestNation: country
  })
);
const allianceRows = (value: z.ZodType) =>
  array(object({ tournamentKey: s, allianceSeed: n, value: value.nullable() }));
put('K1 K2 K3 K11', allianceRows(n));
put('K4', allianceRows(object({ seed: n, rank: n, delta: n })));
put(
  'K5',
  allianceRows(
    object({
      matches: array(object({ ...match, playing: numbers })),
      appearances: array(object({ teamKey: n, count: n }))
    })
  )
);
put('K6', allianceRows(array(object({ teamKey: n, sitOut: n }))));
put(
  'K7',
  allianceRows(
    object({ withDrawn: nullable, withoutDrawn: nullable, delta: n })
  )
);
put(
  'K8',
  allianceRows(
    object({
      captain: n,
      qualificationRankingScore: n,
      playoffTotal: n,
      playoffRank: n
    })
  )
);
put(
  'K9',
  allianceRows(
    object({
      teamKey: n,
      qualificationRankingScore: n,
      meanAllianceScore: nullable
    })
  )
);
put(
  'K10',
  array(
    object({
      ...match,
      redScore: n,
      blueScore: n,
      redAlliance: nullable,
      blueAlliance: nullable
    })
  )
);
put(
  'K12',
  allianceRows(
    object({
      current: n,
      remaining: n,
      nonPenaltyMaximum: n,
      gapToThird: n,
      eliminatedWithoutPenalties: b,
      clinched: z.null(),
      reason: s
    })
  )
);
put(
  'K13',
  array(
    object({
      allianceSeed: n,
      tournamentKey: s,
      advancementProbability: n,
      samples: n
    })
  )
);
put(
  'L1',
  matchRows(
    object({
      suppressionMultiplier: n,
      partner: n,
      fouls: n,
      rounding: n,
      margin: n
    })
  )
);
put(
  'L2',
  matchRows(
    object({
      extinguisher: n,
      coopertition: n,
      shared: n,
      directMarginContribution: n,
      penaltyCaveat: s
    })
  )
);
put(
  'L5 L6',
  array(object({ bucket: n, winRate: nullable, matches: n, ties: n }))
);
put(
  'L7',
  matchRows(object({ zone3Value: n, additionalBalls: n, climbWorthMore: b }))
);
put('L8', teamRows(object({ ...match, score: n })));
put('L9', teamRows(n));
put('L10', array(object({ teamKey: n, points: nullable })));
put(
  'L11',
  array(
    object({
      boundary: n,
      teams: array(object({ teamKey: n, rank: n, rankingScore: n }))
    })
  )
);
put('L12', array(object({ teamKey: n, spread: nullable })));
put('L13', object({ metrics: strings, matrix: array(array(nullable)) }));
put('L14', matchRows(object({ term: s, points: n })));
put('M5', matchRows(array(object({ field: s, count: n }))));
put('M8', array(object({ actorId: s, entries: n })));
put('M9', array(object({ group: s, medianSeconds: nullable })));
put(
  'M12',
  matchRows(
    array(
      object({
        fieldPath: s,
        replayed: jsonSchema,
        authoritative: jsonSchema,
        matches: b
      })
    )
  )
);
put(
  'M13',
  matchRows(
    object({
      pending: n,
      unassociated: n,
      fields: array(object({ field: s, count: n }))
    })
  )
);
put(
  'M14',
  matchRows(
    object({
      entries: array(object({ actionEventId: nullable, seconds: n })),
      meanSeconds: nullable,
      unassociated: n
    })
  )
);
put('M15', matchRows(object({ match: jsonSchema, clock: jsonSchema })));
put(
  'M16',
  matchRows(array(object({ second: n, atUtc: s, red: n, blue: n, margin: n })))
);
put('M17', matchRows(array(object({ second: n, margin: n }))));
put('M21', array(object({ fieldClient: s, entries: n })));
put('M22', object({ rate: n, recognizedRevisions: n, unknownRevisions: n }));
put('M23', array(object({ ...match, actors: strings })));
put(
  'M24',
  matchRows(
    object({
      index: n,
      revisions: n,
      absoluteScoreCorrection: n,
      backoutRate: n,
      foulCorrections: n
    })
  )
);
put(
  'M26',
  matchRows(array(object({ threshold: n, atUtc: s, seconds: nullable })))
);
put(
  'M27',
  matchRows(
    array(
      object({
        revision: nullable,
        seconds: nullable,
        red: nullable,
        blue: nullable
      })
    )
  )
);
export function schemaFor(id: string): z.ZodType<StatResult> {
  const schema = data[id];
  if (!schema) throw new Error('Missing typed result schema for ' + id);
  return z.union([
    object({
      status: z.literal('ok'),
      data: schema,
      quality: z.enum(['complete', 'best_effort', 'degraded']),
      warnings: strings
    }),
    failureSchema
  ]) as z.ZodType<StatResult>;
}
