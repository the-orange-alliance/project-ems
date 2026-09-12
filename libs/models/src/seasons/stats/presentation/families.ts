/**
 * Presentation "shape family" for every stat catalogue id.
 *
 * Mirrors the `put('ID ID ID', schema)` grouping idiom used in
 * `../result-schemas.ts`, and follows the same id ordering, so the two
 * files can be diffed side by side: for every group of ids that share a
 * result schema there, this assigns the visualization family that best
 * fits that schema's shape.
 */

export type VizFamily =
  | 'scalar'
  | 'teamRows'
  | 'teamRowsRecord'
  | 'oprTable'
  | 'matchRows'
  | 'allianceRows'
  | 'histogram'
  | 'ranking'
  | 'timeSeries'
  | 'composite'
  | 'matrix'
  | 'categorical'
  | 'geo';

const families: Record<string, VizFamily> = {};

const put = (ids: string, family: VizFamily) => {
  for (const id of ids.split(' ')) families[id] = family;
};

// --- A: OPR-style team tables, per-team scalars/records, per-match predictions
put('A1 A2 A3 A4 A5 A6 A7 A8 A9', 'oprTable');
put(
  'A10 A12 A13 A22 A24 A25 A26 A28 A29 A31 A32 A33 A35 A37 A39 A40 A41',
  'teamRows'
);
put('A14', 'teamRowsRecord');
put('A15', 'teamRowsRecord');
put('A11', 'teamRowsRecord');
// per-match rows (tournamentKey/matchId + value), some unioned with a failure variant
put('A16 A18 A42', 'matchRows');
put('A17', 'matchRows');
put('A19', 'matchRows');
put(
  'A20 B21 B22 C10 C21 D9 E3 E4 E5 E13 F10 G9 G11 G12 I2 I10 M10 M11 M25',
  'scalar'
);
put('A21', 'matchRows');
put('A23', 'teamRowsRecord');
put('A27', 'teamRowsRecord');
put('A30', 'teamRowsRecord');
put('A34', 'teamRowsRecord');
put('A36', 'teamRowsRecord');
put('A38', 'teamRowsRecord');

// --- B: per-match counters/timelines built with matchRows(...)
put(
  'B1 B2 B3 B4 B5 B6 B7 B8 B9 B10 B11 B12 B15 B18 B20 C2 C3 C14 C15 C17 C18 C22 D1 D2 D7 E1 E2 E6 E7 E8 F3 F4 F15 F16 F17 G2 G3 G14 H1 H3 H4 H7 H8 H9 H10 H13 I1 I3 I4 I5 I6 I9 M1 M2 M3 M4 M6 M7 M18 M19 M20',
  'matchRows'
);
put('B13', 'timeSeries');
put('B14', 'timeSeries');
put('B16', 'matchRows');
put('B17', 'matchRows');
put('B19', 'matchRows');

// --- C: brace/carry stats
put('C1', 'matchRows');
put('C4 C6 C7 C8 D3 E9 G5', 'teamRows');
put('C5', 'teamRowsRecord');
put('C9 D5 D6 E12', 'matchRows');
put('C11 C13', 'teamRowsRecord');
put('C12', 'composite');
put('C16 C20', 'teamRowsRecord');
put('C19', 'teamRowsRecord');

// --- D: carrier/withdrawal-rate stats
put('D4', 'teamRowsRecord');
put('D8', 'composite');
put('E10 E11', 'teamRowsRecord');

// --- F: margin / scoring distribution stats
put('F1 F2', 'matchRows');
put('F5', 'matchRows');
put('F6 L3 L4', 'matchRows');
put('F7', 'composite');
put('F8 F9', 'histogram');
put('F11', 'composite');
put('F12', 'matchRows');
put('F13', 'timeSeries');
put('F14', 'composite');

// --- G: cards / field-usage stats
put('G1', 'matchRows');
put('G4', 'matchRows');
put('G6', 'composite');
put('G7', 'teamRowsRecord');
put('G8', 'categorical');
put('G10', 'matchRows');
put('G13', 'matchRows');

// --- H: endgame / ranking-history stats
put('H2', 'matchRows');
put('H5', 'matchRows');
put('H6', 'timeSeries');
put('H11', 'matchRows');
put('H12', 'ranking');
put('H14', 'matchRows');

// --- I: field utilization
put('I7', 'composite');
put('I8', 'categorical');

// --- J: team demographics / geography / matchups
put('J1', 'geo');
put('J2', 'teamRows');
put('J3', 'teamRows');
put('J4', 'ranking');
put('J5', 'composite');
put('J6', 'geo');
put('J7', 'composite');
put('J8 J9', 'teamRows');
put('J10', 'composite');
put('J11', 'teamRowsRecord');
put('J12', 'teamRowsRecord');
put('J13', 'teamRowsRecord');
put('J14', 'teamRows');
put('J15', 'geo');

// --- K: alliance selection / playoff stats built with allianceRows(...)
put('K1 K2 K3 K11', 'allianceRows');
put('K4', 'allianceRows');
put('K5', 'allianceRows');
put('K6', 'allianceRows');
put('K7', 'allianceRows');
put('K8', 'allianceRows');
put('K9', 'allianceRows');
put('K10', 'matchRows');
put('K12', 'allianceRows');
put('K13', 'allianceRows');

// --- L: margin decomposition / correlation stats
put('L1', 'matchRows');
put('L2', 'matchRows');
put('L5 L6', 'histogram');
put('L7', 'matchRows');
put('L8', 'teamRowsRecord');
put('L9', 'teamRows');
put('L10', 'teamRows');
put('L11', 'ranking');
put('L12', 'teamRows');
put('L13', 'matrix');
put('L14', 'matchRows');

// --- M: scorekeeping / revision-integrity stats
put('M5', 'matchRows');
put('M8', 'categorical');
put('M9', 'categorical');
put('M12', 'matchRows');
put('M13', 'matchRows');
put('M14', 'matchRows');
put('M15', 'matchRows');
put('M16', 'timeSeries');
put('M17', 'timeSeries');
put('M21', 'categorical');
put('M22', 'composite');
put('M23', 'matchRows');
put('M24', 'matchRows');
put('M26', 'timeSeries');
put('M27', 'timeSeries');

export { families };

export function familyFor(catalogueId: string): VizFamily {
  const family = families[catalogueId];
  if (!family) throw new Error('Unknown catalogue id: ' + catalogueId);
  return family;
}
