/**
 * Display metadata for every stat catalogue id.
 *
 * The stats engine (see `../catalogue.ts` / `../registry.ts`) knows how to
 * *compute* 232 stats, but carries no rendering metadata: its `units` field
 * is inferred by regex from the stat's name and its `precision` field is
 * hardcoded to `4` for everything. Neither is usable for formatting a
 * graphic. This module is the real source of display truth, layered on top
 * of the shape classification in `./families.ts`:
 *
 *   VizFamily (families.ts) -> familyDefaults (kind/precision/direction) -> per-id overrides
 *
 * `presentationFor(catalogueId)` is what a renderer should call to decide
 * which `GraphicKind` to draw, which fields inside a nested `value` to plot,
 * and how to label/format the numbers.
 */

import { catalogue } from '../catalogue.js';
import { familyFor, type VizFamily } from './families.js';
import type { GraphicKind } from '../../../base/Graphics.js';
// Imported for `presentationFor`'s own function body ONLY (see the doc
// comment there) - never touched at this module's own top level - so this
// stays safe despite `semantic-registry.ts` -> `adapters.ts` -> this same
// file already being a real (and otherwise one-directional) import cycle.
import {
  FGC2026_SEASON_KEY,
  semanticRegistrationFor
} from './semantic-registry.js';

export interface StatPresentation {
  family: VizFamily;
  defaultKind: GraphicKind;
  allowedKinds: GraphicKind[];
  /** Field names inside a row's `value` for nested records; [] when value is scalar. */
  valuePaths: string[];
  /** Axis / tile label, e.g. 'OPR'. */
  valueLabel: string;
  /** '', 'pts', 's', '%', or a compact compound unit like 'balls/s'. */
  unitLabel: string;
  /** Real display precision (decimal places), typically 0-3. */
  precision: number;
  higherIsBetter: boolean;
}

/**
 * Baseline kind/precision/direction for each shape family. Every
 * `allowedKinds` list includes `'table'` as a universal fallback, plus
 * `'bar'` wherever the underlying rows could sensibly be drawn as a bar
 * chart.
 */
const familyDefaults: Record<
  VizFamily,
  {
    defaultKind: GraphicKind;
    allowedKinds: GraphicKind[];
    precision: number;
    higherIsBetter: boolean;
  }
> = {
  scalar: {
    defaultKind: 'stat-tile',
    allowedKinds: ['stat-tile', 'table'],
    precision: 2,
    higherIsBetter: true
  },
  teamRows: {
    defaultKind: 'bar',
    allowedKinds: ['bar', 'table'],
    precision: 2,
    higherIsBetter: true
  },
  teamRowsRecord: {
    defaultKind: 'grouped-bar',
    allowedKinds: ['grouped-bar', 'bar', 'table'],
    precision: 2,
    higherIsBetter: true
  },
  oprTable: {
    defaultKind: 'bar',
    allowedKinds: ['bar', 'table'],
    precision: 1,
    higherIsBetter: true
  },
  matchRows: {
    defaultKind: 'bar',
    allowedKinds: ['bar', 'table'],
    precision: 2,
    higherIsBetter: true
  },
  allianceRows: {
    defaultKind: 'bar',
    allowedKinds: ['bar', 'table'],
    precision: 1,
    higherIsBetter: true
  },
  histogram: {
    defaultKind: 'histogram',
    allowedKinds: ['histogram', 'bar', 'table'],
    precision: 0,
    higherIsBetter: true
  },
  ranking: {
    defaultKind: 'ranking-table',
    allowedKinds: ['ranking-table', 'table'],
    precision: 0,
    higherIsBetter: true
  },
  timeSeries: {
    defaultKind: 'line',
    allowedKinds: ['line', 'table'],
    precision: 1,
    higherIsBetter: true
  },
  composite: {
    defaultKind: 'stat-tile',
    allowedKinds: ['stat-tile', 'table'],
    precision: 1,
    higherIsBetter: true
  },
  matrix: {
    defaultKind: 'heatmap',
    allowedKinds: ['heatmap', 'table'],
    precision: 2,
    higherIsBetter: true
  },
  categorical: {
    defaultKind: 'bar',
    allowedKinds: ['bar', 'table'],
    precision: 0,
    higherIsBetter: true
  },
  geo: {
    defaultKind: 'geo-map',
    allowedKinds: ['geo-map', 'table'],
    precision: 0,
    higherIsBetter: true
  }
};

interface Override {
  unitLabel: string;
  precision: number;
  /** Present (and `false`) only for stats where a lower value is better. */
  higherIsBetter?: false;
  /** Field names inside a nested `value` (or record row); omitted -> []. */
  valuePaths?: string[];
  /** Rare bespoke kind override; omitted -> family default. */
  defaultKind?: GraphicKind;
  allowedKinds?: GraphicKind[];
}

/**
 * Per-id bespoke display metadata. Every one of the 232 catalogue ids is
 * listed explicitly here — see the header comment for how `unitLabel` /
 * `precision` / `higherIsBetter` were chosen per stat (rate/share/probability
 * -> '%'; time/latency/cadence/drought/split -> 's'; score/points/opr/epa/
 * margin -> 'pts'; counts -> ''), with `higherIsBetter: false` set wherever a
 * lower value is the good outcome (penalties, fouls, cards, latency,
 * drought, backout/error rates, time-to-X, ranks).
 */
const overrides: Record<string, Override> = {
  // --- A: ratings / predictions / tiebreakers
  A1: { unitLabel: 'pts', precision: 1 },
  A2: { unitLabel: 'pts', precision: 1 },
  A3: { unitLabel: 'pts', precision: 1 },
  A4: { unitLabel: 'pts', precision: 1 },
  A5: { unitLabel: 'pts', precision: 1 },
  A6: { unitLabel: 'pts', precision: 1, higherIsBetter: false },
  A7: { unitLabel: 'pts', precision: 1 },
  A8: { unitLabel: 'pts', precision: 1 },
  A9: { unitLabel: 'pts', precision: 1 },
  A10: { unitLabel: 'pts', precision: 1 },
  A11: {
    unitLabel: 'pts',
    precision: 1,
    valuePaths: ['suppression', 'climb', 'partner']
  },
  A12: { unitLabel: '', precision: 2 },
  A13: { unitLabel: '', precision: 0 },
  A14: { unitLabel: '', precision: 0, valuePaths: ['peak', 'delta'] },
  A15: { unitLabel: '', precision: 2, valuePaths: ['mu', 'sigma'] },
  A16: { unitLabel: '%', precision: 1 },
  A17: { unitLabel: 'pts', precision: 1 },
  A18: { unitLabel: 'pts', precision: 1 },
  A19: {
    unitLabel: 'pts',
    precision: 1,
    valuePaths: ['red', 'blue', 'samples']
  },
  A20: { unitLabel: '', precision: 3, higherIsBetter: false },
  A21: { unitLabel: '%', precision: 1 },
  A22: { unitLabel: 'pts', precision: 1, higherIsBetter: false },
  A23: { unitLabel: 'pts', precision: 1, valuePaths: ['floor', 'ceiling'] },
  A24: { unitLabel: 'pts', precision: 1 },
  A25: { unitLabel: 'pts', precision: 1 },
  A26: { unitLabel: 'pts', precision: 1 },
  A27: {
    unitLabel: '',
    precision: 0,
    valuePaths: ['wins', 'losses', 'ties', 'played']
  },
  A28: { unitLabel: '%', precision: 1 },
  A29: { unitLabel: 'pts', precision: 2 },
  A30: {
    unitLabel: '',
    precision: 0,
    higherIsBetter: false,
    valuePaths: ['rank', 'rankChange']
  },
  A31: { unitLabel: '', precision: 2, higherIsBetter: false },
  A32: { unitLabel: 'pts', precision: 1 },
  A33: { unitLabel: 'pts', precision: 2 },
  A34: {
    unitLabel: 'pts',
    precision: 1,
    valuePaths: ['average', 'median']
  },
  A35: { unitLabel: 'pts', precision: 1 },
  A36: {
    unitLabel: '',
    precision: 0,
    valuePaths: ['played', 'surrogate']
  },
  A37: { unitLabel: '', precision: 0 },
  A38: {
    unitLabel: '',
    precision: 0,
    valuePaths: ['wins', 'losses', 'ties']
  },
  A39: { unitLabel: '%', precision: 1 },
  A40: { unitLabel: 'pts', precision: 1 },
  A41: { unitLabel: 'pts', precision: 2 },
  A42: { unitLabel: 'pts', precision: 1 },

  // --- B: WILDFIRE containment counters / timelines
  B1: { unitLabel: '', precision: 0 },
  B2: { unitLabel: '', precision: 0 },
  B3: { unitLabel: '', precision: 0 },
  B4: { unitLabel: '%', precision: 1 },
  B5: { unitLabel: '', precision: 0, higherIsBetter: false },
  B6: { unitLabel: '%', precision: 1 },
  B7: { unitLabel: '%', precision: 1 },
  B8: { unitLabel: '', precision: 0 },
  B9: { unitLabel: 'balls/s', precision: 2 },
  B10: { unitLabel: 'balls/s', precision: 2 },
  B11: { unitLabel: '', precision: 0 },
  B12: { unitLabel: 's', precision: 1, higherIsBetter: false },
  B13: {
    unitLabel: 's',
    precision: 1,
    higherIsBetter: false,
    valuePaths: ['milestone', 'seconds']
  },
  B14: { unitLabel: '', precision: 2, valuePaths: ['skew'] },
  B15: { unitLabel: 's', precision: 1, higherIsBetter: false },
  B16: {
    unitLabel: '',
    precision: 0,
    valuePaths: ['entries', 'netEntered']
  },
  B17: {
    unitLabel: '',
    precision: 0,
    higherIsBetter: false,
    valuePaths: ['red', 'blue', 'extinguisher']
  },
  B18: { unitLabel: 'pts', precision: 2 },
  B19: {
    unitLabel: '%',
    precision: 1,
    valuePaths: ['steps', 'typed', 'stepShare']
  },
  B20: { unitLabel: 'pts', precision: 1 },
  B21: { unitLabel: '', precision: 0 },
  B22: { unitLabel: '%', precision: 1 },

  // --- C: climb / brace
  C1: { unitLabel: '', precision: 2, valuePaths: ['brace'] },
  C2: { unitLabel: '', precision: 2 },
  C3: { unitLabel: '%', precision: 1 },
  C4: { unitLabel: '%', precision: 1 },
  C5: { unitLabel: '', precision: 0, valuePaths: ['brace', 'count'] },
  C6: { unitLabel: '%', precision: 1 },
  C7: { unitLabel: '%', precision: 1 },
  C8: { unitLabel: '', precision: 2 },
  C9: { unitLabel: '', precision: 0 },
  C10: { unitLabel: '', precision: 2 },
  C11: { unitLabel: 'pts', precision: 1, valuePaths: ['value'] },
  C12: { unitLabel: 'pts', precision: 1, valuePaths: ['value'] },
  C13: { unitLabel: 'pts', precision: 1, higherIsBetter: false },
  C14: { unitLabel: 'pts', precision: 1 },
  C15: { unitLabel: 'pts', precision: 1 },
  C16: {
    unitLabel: 's',
    precision: 1,
    higherIsBetter: false,
    valuePaths: ['value']
  },
  C17: { unitLabel: 's', precision: 1 },
  C18: { unitLabel: 's', precision: 1 },
  C19: { unitLabel: '', precision: 0, valuePaths: ['from', 'to'] },
  C20: {
    unitLabel: '',
    precision: 0,
    higherIsBetter: false,
    valuePaths: ['value']
  },
  C21: { unitLabel: '', precision: 0 },
  C22: { unitLabel: '', precision: 0 },

  // --- D: carry / carrier
  D1: { unitLabel: '', precision: 0 },
  D2: { unitLabel: 'pts', precision: 1 },
  D3: { unitLabel: '%', precision: 1 },
  D4: {
    unitLabel: '%',
    precision: 1,
    valuePaths: ['rate', 'identifiedMatches', 'ambiguousMatches']
  },
  D5: { unitLabel: '', precision: 0 },
  D6: { unitLabel: '', precision: 0 },
  D7: { unitLabel: '%', precision: 1 },
  D8: {
    unitLabel: '%',
    precision: 1,
    valuePaths: ['rate', 'identifiedMatches', 'ambiguousMatches']
  },
  D9: { unitLabel: 'pts', precision: 0 },

  // --- E: coopertition
  E1: { unitLabel: 'pts', precision: 1 },
  E2: { unitLabel: '', precision: 0 },
  E3: { unitLabel: '%', precision: 1 },
  E4: { unitLabel: '%', precision: 1 },
  E5: { unitLabel: '%', precision: 1 },
  E6: { unitLabel: 'pts', precision: 1 },
  E7: { unitLabel: '%', precision: 1 },
  E8: { unitLabel: 'pts', precision: 1 },
  E9: { unitLabel: 'pts', precision: 1 },
  E10: { unitLabel: '', precision: 0, valuePaths: ['value'] },
  E11: {
    unitLabel: '',
    precision: 0,
    higherIsBetter: false,
    valuePaths: ['value']
  },
  E12: { unitLabel: '', precision: 0 },
  E13: { unitLabel: 'pts', precision: 0 },

  // --- F: score composition / distribution
  F1: {
    unitLabel: 'pts',
    precision: 1,
    valuePaths: [
      'suppression',
      'partner',
      'extinguisher',
      'coopertition',
      'fouls'
    ]
  },
  F2: {
    unitLabel: '%',
    precision: 1,
    valuePaths: [
      'suppression',
      'partner',
      'extinguisher',
      'coopertition',
      'fouls'
    ]
  },
  F3: { unitLabel: 'pts', precision: 1 },
  F4: { unitLabel: 'pts', precision: 1 },
  F5: { unitLabel: 'pts', precision: 1, valuePaths: ['red', 'blue'] },
  F6: { unitLabel: 'pts', precision: 1, valuePaths: ['red', 'blue'] },
  F7: { unitLabel: 'pts', precision: 1, valuePaths: ['highest', 'lowest'] },
  F8: { unitLabel: 'pts', precision: 0 },
  F9: { unitLabel: 'pts', precision: 0 },
  F10: { unitLabel: '', precision: 0 },
  F11: { unitLabel: 'pts', precision: 1, valuePaths: ['margin'] },
  F12: { unitLabel: 'pts', precision: 1, valuePaths: ['meanScore'] },
  F13: { unitLabel: 'pts', precision: 1, valuePaths: ['score'] },
  F14: { unitLabel: 'pts', precision: 0, valuePaths: ['points'] },
  F15: { unitLabel: '%', precision: 1 },
  F16: { unitLabel: 'pts', precision: 2 },
  F17: { unitLabel: 'pts', precision: 2 },

  // --- G: fouls / cards
  G1: {
    unitLabel: '',
    precision: 0,
    higherIsBetter: false,
    valuePaths: ['minor', 'major']
  },
  G2: { unitLabel: 'pts', precision: 1 },
  G3: { unitLabel: '%', precision: 1 },
  G4: { unitLabel: '', precision: 0 },
  G5: { unitLabel: '', precision: 2, higherIsBetter: false },
  G6: {
    unitLabel: '',
    precision: 0,
    higherIsBetter: false,
    valuePaths: ['yellow', 'red', 'white']
  },
  G7: {
    unitLabel: '',
    precision: 0,
    higherIsBetter: false,
    valuePaths: ['cardStatus']
  },
  G8: {
    unitLabel: '',
    precision: 0,
    higherIsBetter: false,
    valuePaths: ['cards']
  },
  G9: { unitLabel: '%', precision: 1, higherIsBetter: false },
  G10: {
    unitLabel: '',
    precision: 0,
    higherIsBetter: false,
    valuePaths: ['excludedFromRanking']
  },
  G11: { unitLabel: '', precision: 0, higherIsBetter: false },
  G12: { unitLabel: '', precision: 0, higherIsBetter: false },
  G13: { unitLabel: 's', precision: 1, valuePaths: ['seconds'] },
  G14: { unitLabel: '', precision: 0, higherIsBetter: false },

  // --- H: live / endgame
  H1: { unitLabel: 'pts/s', precision: 2 },
  H2: {
    unitLabel: 'pts',
    precision: 1,
    valuePaths: ['projected', 'expectedEndgame']
  },
  H3: { unitLabel: '%', precision: 1 },
  H4: { unitLabel: 's', precision: 1, higherIsBetter: false },
  H5: { unitLabel: '', precision: 0, valuePaths: ['entries'] },
  H6: { unitLabel: '', precision: 0, valuePaths: ['balls'] },
  H7: { unitLabel: 'balls', precision: 0, higherIsBetter: false },
  H8: { unitLabel: '', precision: 0, higherIsBetter: false },
  H9: { unitLabel: '', precision: 0, higherIsBetter: false },
  H10: { unitLabel: 'pts', precision: 0 },
  H11: {
    unitLabel: '',
    precision: 0,
    higherIsBetter: false,
    valuePaths: ['balls']
  },
  H12: { unitLabel: '', precision: 0, higherIsBetter: false },
  H13: { unitLabel: 'pts', precision: 1 },
  H14: {
    unitLabel: 'pts',
    precision: 1,
    valuePaths: ['worst', 'best', 'suppressionFrozen']
  },

  // --- I: field operations
  I1: { unitLabel: 's', precision: 1, higherIsBetter: false },
  I2: { unitLabel: 's', precision: 1, higherIsBetter: false },
  I3: { unitLabel: 's', precision: 1, higherIsBetter: false },
  I4: { unitLabel: 's', precision: 1, higherIsBetter: false },
  I5: { unitLabel: 's', precision: 1, higherIsBetter: false },
  I6: { unitLabel: 's', precision: 1, higherIsBetter: false },
  I7: { unitLabel: '', precision: 0, valuePaths: ['played', 'remaining'] },
  I8: { unitLabel: 'pts', precision: 1, valuePaths: ['meanScore', 'matches'] },
  I9: { unitLabel: 's', precision: 1, higherIsBetter: false },
  I10: { unitLabel: 'balls/hr', precision: 1 },

  // --- J: demographics / geography / matchups
  J1: { unitLabel: '', precision: 0 },
  J2: { unitLabel: '', precision: 0, valuePaths: ['robotName'] },
  J3: { unitLabel: '', precision: 0, valuePaths: ['rookie'] },
  J4: { unitLabel: '', precision: 0 },
  J5: { unitLabel: 'pts', precision: 1, valuePaths: ['score'] },
  J6: { unitLabel: 'pts', precision: 2, valuePaths: ['meanRankingScore'] },
  J7: {
    unitLabel: '',
    precision: 0,
    valuePaths: ['wins', 'losses', 'ties']
  },
  J8: { unitLabel: '', precision: 0 },
  J9: { unitLabel: '', precision: 0 },
  J10: { unitLabel: 'pts', precision: 2, valuePaths: ['slope'] },
  J11: { unitLabel: '', precision: 0, valuePaths: ['partners'] },
  J12: { unitLabel: '', precision: 0, valuePaths: ['teamKeys'] },
  J13: { unitLabel: 'pts', precision: 1, valuePaths: ['worst', 'best'] },
  J14: { unitLabel: '', precision: 0, valuePaths: ['wins'] },
  J15: { unitLabel: '', precision: 1, valuePaths: ['latitude', 'area'] },

  // --- K: alliance selection / playoffs
  K1: { unitLabel: 'pts', precision: 1 },
  K2: { unitLabel: 'pts', precision: 1 },
  K3: { unitLabel: 'pts', precision: 1 },
  K4: {
    unitLabel: '',
    precision: 0,
    valuePaths: ['seed', 'rank', 'delta']
  },
  K5: { unitLabel: '', precision: 0, valuePaths: ['count'] },
  K6: {
    unitLabel: '',
    precision: 0,
    higherIsBetter: false,
    valuePaths: ['sitOut']
  },
  K7: {
    unitLabel: 'pts',
    precision: 1,
    valuePaths: ['withDrawn', 'withoutDrawn', 'delta']
  },
  K8: {
    unitLabel: 'pts',
    precision: 1,
    valuePaths: [
      'captain',
      'qualificationRankingScore',
      'playoffTotal',
      'playoffRank'
    ]
  },
  K9: {
    unitLabel: 'pts',
    precision: 1,
    valuePaths: ['qualificationRankingScore', 'meanAllianceScore']
  },
  K10: {
    unitLabel: 'pts',
    precision: 1,
    valuePaths: ['redScore', 'blueScore']
  },
  K11: { unitLabel: 'pts', precision: 0 },
  K12: {
    unitLabel: 'pts',
    precision: 0,
    valuePaths: ['current', 'remaining', 'nonPenaltyMaximum', 'gapToThird']
  },
  K13: { unitLabel: '%', precision: 1, valuePaths: ['advancementProbability'] },

  // --- L: margin decomposition / correlation
  L1: {
    unitLabel: 'pts',
    precision: 1,
    valuePaths: [
      'suppressionMultiplier',
      'partner',
      'fouls',
      'rounding',
      'margin'
    ]
  },
  L2: {
    unitLabel: 'pts',
    precision: 1,
    valuePaths: [
      'extinguisher',
      'coopertition',
      'shared',
      'directMarginContribution'
    ]
  },
  L3: { unitLabel: 'pts', precision: 1, valuePaths: ['red', 'blue'] },
  L4: { unitLabel: 'pts', precision: 1, valuePaths: ['red', 'blue'] },
  L5: {
    unitLabel: '%',
    precision: 1,
    valuePaths: ['winRate', 'matches', 'ties']
  },
  L6: {
    unitLabel: '%',
    precision: 1,
    valuePaths: ['winRate', 'matches', 'ties']
  },
  L7: {
    unitLabel: 'pts',
    precision: 1,
    valuePaths: ['zone3Value', 'additionalBalls']
  },
  L8: { unitLabel: 'pts', precision: 1, valuePaths: ['score'] },
  L9: { unitLabel: 'pts', precision: 1 },
  L10: { unitLabel: 'pts', precision: 2, valuePaths: ['points'] },
  L11: {
    unitLabel: '',
    precision: 0,
    valuePaths: ['rank', 'rankingScore']
  },
  L12: { unitLabel: 'pts', precision: 2, valuePaths: ['spread'] },
  L13: { unitLabel: '', precision: 2 },
  L14: { unitLabel: 'pts', precision: 1, valuePaths: ['points'] },

  // --- M: scorekeeping / revision integrity
  M1: { unitLabel: '', precision: 0, higherIsBetter: false },
  M2: { unitLabel: '', precision: 0, higherIsBetter: false },
  M3: { unitLabel: 'pts', precision: 1, higherIsBetter: false },
  M4: { unitLabel: 'pts', precision: 1, higherIsBetter: false },
  M5: {
    unitLabel: '',
    precision: 0,
    higherIsBetter: false,
    valuePaths: ['count']
  },
  M6: { unitLabel: 's', precision: 1, higherIsBetter: false },
  M7: { unitLabel: 's', precision: 1, higherIsBetter: false },
  M8: { unitLabel: '', precision: 0, valuePaths: ['entries'] },
  M9: { unitLabel: 's', precision: 1, valuePaths: ['medianSeconds'] },
  M10: { unitLabel: '', precision: 2, higherIsBetter: false },
  M11: { unitLabel: '%', precision: 1, higherIsBetter: false },
  M12: { unitLabel: '', precision: 0, valuePaths: ['matches'] },
  M13: {
    unitLabel: '',
    precision: 0,
    higherIsBetter: false,
    valuePaths: ['pending', 'unassociated']
  },
  M14: {
    unitLabel: 's',
    precision: 2,
    higherIsBetter: false,
    valuePaths: ['meanSeconds', 'unassociated']
  },
  M15: { unitLabel: '', precision: 0 },
  M16: {
    unitLabel: 'pts',
    precision: 1,
    valuePaths: ['red', 'blue', 'margin']
  },
  M17: { unitLabel: 'pts', precision: 1, valuePaths: ['margin'] },
  M18: { unitLabel: '', precision: 0 },
  M19: { unitLabel: 'pts', precision: 1 },
  M20: { unitLabel: '', precision: 0, higherIsBetter: false },
  M21: { unitLabel: '', precision: 0, valuePaths: ['entries'] },
  M22: {
    unitLabel: '%',
    precision: 1,
    higherIsBetter: false,
    valuePaths: ['rate', 'recognizedRevisions', 'unknownRevisions']
  },
  M23: { unitLabel: '', precision: 0, valuePaths: ['actors'] },
  M24: {
    unitLabel: '',
    precision: 1,
    higherIsBetter: false,
    valuePaths: [
      'index',
      'revisions',
      'absoluteScoreCorrection',
      'backoutRate',
      'foulCorrections'
    ]
  },
  M25: { unitLabel: '%', precision: 1, higherIsBetter: false },
  M26: { unitLabel: 's', precision: 1, valuePaths: ['threshold', 'seconds'] },
  M27: { unitLabel: '', precision: 2, valuePaths: ['seconds', 'red', 'blue'] }
};

const presentations: Record<string, StatPresentation> = {};

for (const row of catalogue) {
  const family = familyFor(row.catalogueId);
  const base = familyDefaults[family];
  const override = overrides[row.catalogueId];
  presentations[row.catalogueId] = {
    family,
    defaultKind: override?.defaultKind ?? base.defaultKind,
    allowedKinds: override?.allowedKinds ?? base.allowedKinds,
    valuePaths: override?.valuePaths ?? [],
    valueLabel: row.name,
    unitLabel: override?.unitLabel ?? '',
    precision: override?.precision ?? base.precision,
    higherIsBetter: override?.higherIsBetter ?? base.higherIsBetter
  };
}

/**
 * `defaultKind`/`allowedKinds` on the family-classified `presentations` map
 * above are a GUESS (family -> plausible default chart types), not the
 * truth - the actual, ENFORCED set of kinds a stat can render as lives on
 * its semantic registration (`SEMANTIC_PRESENTATION_REGISTRY`'s
 * `metadata.defaultKind`/`supportedKinds` - see `semantic-registry.ts`),
 * whose `adapt()` throws `SemanticPreparationError: unsupported
 * presentation kind` for anything outside that set.
 *
 * Those two had drifted apart for the large majority of stats (e.g. F1
 * "Full Breakdown" only actually supports `grouped-bar`, but its family
 * guess offered `bar`/`table` too) - every producer-facing consumer of a
 * stat's kind (the Kind `Select` in `graphic-inspector.tsx`, its own
 * corrective effect, and `build-default-spec.ts`'s initial spec) reads
 * `presentationFor(...).defaultKind`/`.allowedKinds`, so that drift meant
 * the UI would happily offer, or even default to, a kind the stat's real
 * adapter rejects outright - reproducibly hitting exactly that thrown error
 * the moment the producer tried to cue/take it.
 *
 * Overridden here (lazily, inside this function - see the import comment
 * above) so every one of those call sites is correct for free, without
 * hunting down and re-deriving the right kind at each one individually -
 * and so the two can never drift apart again.
 */
export function presentationFor(catalogueId: string): StatPresentation {
  const presentation = presentations[catalogueId];
  if (!presentation) {
    throw new Error('Unknown catalogue id: ' + catalogueId);
  }
  const semantic = semanticRegistrationFor(FGC2026_SEASON_KEY, catalogueId);
  if (!semantic) return presentation;
  return {
    ...presentation,
    defaultKind: semantic.metadata.defaultKind,
    // `supportedKinds` is `readonly GraphicKind[]` (see `SemanticMetadata`);
    // `StatPresentation.allowedKinds` is a plain mutable array, hence the copy.
    allowedKinds: [...semantic.metadata.supportedKinds]
  };
}

export function allPresentations(): Record<string, StatPresentation> {
  return presentations;
}
