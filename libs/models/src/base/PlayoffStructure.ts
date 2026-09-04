import { TournamentType } from './Schedule.js';

/**
 * A named playoff match structure the user can pick when generating a fixed
 * (non-MatchMaker) schedule. Each structure owns the alliance-vs-alliance
 * pairing table for one playoff format so the numbers live in exactly one
 * place instead of being hard-coded in the frontend.
 *
 * NOTE: this module must not import from `../fgc/*` - `fgc/Matches.ts` and
 * `fgc/Schedule.ts` already depend on `base/`, and importing back would create
 * a cycle. The FGC pairing values are duplicated here on purpose.
 */
export interface PlayoffStructure {
  /** Stable id, referenced by the match-scheduler dropdown. */
  key: string;
  /** Human-readable label for the dropdown. */
  name: string;
  /** Which tournament type this structure is offered for. */
  tournamentType: Extract<
    TournamentType,
    'Round Robin' | 'Eliminations' | 'Finals'
  >;
  /** Highest alliance rank referenced by {@link matchMap}. */
  allianceCount: number;
  /**
   * Match pairings, indexed by match number (0-based). Each entry is
   * `[redAllianceRank, blueAllianceRank]` and is resolved to teams by
   * {@link createFixedMatches}.
   */
  matchMap: number[][];
  description?: string;
}

/**
 * FGC playoff round robin - 8 alliances, 16 matches (each alliance plays every
 * other once). Matches the 2026 FGC Game Manual Table 6-2.
 */
export const FGC_ROUND_ROBIN_8: PlayoffStructure = {
  key: 'fgc-round-robin-8',
  name: 'FGC Round Robin - 8 Alliances (16 Matches)',
  tournamentType: 'Round Robin',
  allianceCount: 8,
  matchMap: [
    [4, 7],
    [5, 6],
    [3, 8],
    [1, 2],
    [5, 4],
    [3, 6],
    [2, 7],
    [1, 8],
    [3, 4],
    [2, 5],
    [1, 6],
    [7, 8],
    [2, 3],
    [1, 4],
    [5, 8],
    [6, 7]
  ],
  description:
    'FIRST Global playoff round robin among the top 8 tournament alliances (Game Manual Table 6-2).'
};

/**
 * FGC finals - round robin among the top 3 tournament alliances, 3 matches.
 * Matches the 2026 FGC Game Manual Table 6-3.
 */
export const FGC_FINALS_TOP_3: PlayoffStructure = {
  key: 'fgc-finals-top-3',
  name: 'FGC Finals - Top 3 (3 Matches)',
  tournamentType: 'Finals',
  allianceCount: 3,
  matchMap: [
    [1, 3],
    [3, 2],
    [2, 1]
  ],
  description:
    'FIRST Global finals round robin among the top 3 tournament alliances (Game Manual Table 6-3).'
};

export const PLAYOFF_STRUCTURES: readonly PlayoffStructure[] = [
  FGC_ROUND_ROBIN_8,
  FGC_FINALS_TOP_3
];

/**
 * Legacy `MatchSchedulerDropdown` values persisted before the registry existed,
 * mapped to their current structure keys.
 */
const LEGACY_KEYS: Record<string, string> = {
  fgc_2023: FGC_ROUND_ROBIN_8.key,
  fgc_2023_2: FGC_FINALS_TOP_3.key
};

/**
 * Normalize a (possibly legacy) structure key to a current registry key, or
 * `undefined` if it matches nothing.
 */
export const resolvePlayoffStructureKey = (
  key: string | null | undefined
): string | undefined => {
  if (!key) return undefined;
  if (PLAYOFF_STRUCTURES.some((s) => s.key === key)) return key;
  return LEGACY_KEYS[key];
};

/** Look up a structure by key (accepts legacy keys). */
export const getPlayoffStructure = (
  key: string | null | undefined
): PlayoffStructure | undefined => {
  const resolved = resolvePlayoffStructureKey(key);
  return resolved
    ? PLAYOFF_STRUCTURES.find((s) => s.key === resolved)
    : undefined;
};

/** All structures registered for a given tournament type. */
export const getPlayoffStructuresForType = (
  type: TournamentType
): PlayoffStructure[] =>
  PLAYOFF_STRUCTURES.filter((s) => s.tournamentType === type);

/** The default structure key for a tournament type (first registered), if any. */
export const getDefaultPlayoffStructureKey = (
  type: TournamentType
): string | undefined => getPlayoffStructuresForType(type)[0]?.key;
