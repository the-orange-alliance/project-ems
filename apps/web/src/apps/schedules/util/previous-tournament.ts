import {
  AllianceMember,
  Ranking,
  Tournament,
  isPlayoffsTournamentType
} from '@toa-lib/models';

/**
 * Ranking used to break ties when a stored `tournamentLevel` is unreliable
 * (e.g. an "Eliminations" tournament saved with the wrong level). Higher wins.
 */
const TYPE_RANK: Record<string, number> = {
  Finals: 5,
  Eliminations: 4,
  'Round Robin': 3,
  Ranking: 2,
  Qualification: 1
};

const byLevelDesc = (a: Tournament, b: Tournament): number =>
  b.tournamentLevel - a.tournamentLevel ||
  (TYPE_RANK[b.tournamentType] ?? 0) - (TYPE_RANK[a.tournamentType] ?? 0);

/**
 * Every tournament whose alliances the given tournament could be seeded from,
 * best candidate first:
 *  - lower playoff tournaments (Finals -> Eliminations / Round Robin), closest
 *    predecessor first;
 *  - then Ranking/Qualification tournaments, highest level first.
 * Returns `[]` when there is nothing sensible to pull from.
 */
export const findPreviousTournaments = (
  current: Tournament | undefined,
  all: Tournament[] | undefined
): Tournament[] => {
  if (!current || !all) return [];
  const others = all.filter((t) => t.tournamentKey !== current.tournamentKey);

  const lowerPlayoffs = isPlayoffsTournamentType(current.tournamentType)
    ? others
        .filter(
          (t) =>
            isPlayoffsTournamentType(t.tournamentType) &&
            t.tournamentLevel < current.tournamentLevel
        )
        .sort(byLevelDesc)
    : [];

  const qualPhase = others
    .filter(
      (t) =>
        t.tournamentType === 'Ranking' || t.tournamentType === 'Qualification'
    )
    .sort(byLevelDesc);

  const seen = new Set<string>();
  return [...lowerPlayoffs, ...qualPhase].filter((t) => {
    if (seen.has(t.tournamentKey)) return false;
    seen.add(t.tournamentKey);
    return true;
  });
};

/**
 * The single best tournament to pull alliances from, or `undefined`.
 * @see findPreviousTournaments
 */
export const findPreviousTournament = (
  current: Tournament | undefined,
  all: Tournament[] | undefined
): Tournament | undefined => findPreviousTournaments(current, all)[0];

export interface PulledAlliance {
  /** Remapped 1..X in standings order. */
  allianceRank: number;
  /** The alliance's rank in the source tournament. */
  sourceAllianceRank: number;
  /** Best (lowest) member rank in the source rankings; fallback = sourceAllianceRank. */
  standing: number;
  /** False when standings weren't available and ordering fell back to alliance number. */
  hasStandings: boolean;
  allianceNameLong: string;
  allianceNameShort: string;
  /** Member team keys ordered by pickOrder. */
  teamKeys: number[];
}

/**
 * Take the top `take` alliances from a source tournament, ordered by their
 * standing in that tournament, and remap their ranks to 1..take. Alliance
 * names and every member team carry over.
 */
export const computePulledAlliances = (
  sourceAlliances: AllianceMember[] | undefined,
  sourceRankings: Ranking[] | undefined,
  take: number
): PulledAlliance[] => {
  if (!sourceAlliances || sourceAlliances.length === 0 || take <= 0) return [];

  const rankByTeam = new Map<number, number>();
  for (const r of sourceRankings ?? []) rankByTeam.set(r.teamKey, r.rank);

  const groups = new Map<number, AllianceMember[]>();
  for (const member of sourceAlliances) {
    const list = groups.get(member.allianceRank) ?? [];
    list.push(member);
    groups.set(member.allianceRank, list);
  }

  const alliances = Array.from(groups.entries()).map(
    ([sourceAllianceRank, members]) => {
      const sorted = [...members].sort((a, b) => a.pickOrder - b.pickOrder);
      const memberRanks = sorted
        .map((m) => rankByTeam.get(m.teamKey))
        .filter((v): v is number => typeof v === 'number');
      const hasStandings = memberRanks.length > 0;
      return {
        sourceAllianceRank,
        standing: hasStandings ? Math.min(...memberRanks) : sourceAllianceRank,
        hasStandings,
        allianceNameLong: sorted[0]?.allianceNameLong ?? '',
        allianceNameShort: sorted[0]?.allianceNameShort ?? '',
        teamKeys: sorted.map((m) => m.teamKey)
      };
    }
  );

  return alliances
    .sort(
      (a, b) =>
        a.standing - b.standing || a.sourceAllianceRank - b.sourceAllianceRank
    )
    .slice(0, take)
    .map((a, i) => ({ ...a, allianceRank: i + 1 }));
};

/**
 * Build alliances from a qualification/ranking tournament's team rankings using
 * a serpentine seed table (FGC Game Manual Table 6-1): `seedMap[i]` lists the
 * qual ranks that fill alliance `i + 1`'s named seats (captain, pick 1, pick 2,
 * ...). Any seat the table does not name — e.g. the "Random Draw" 4th robot —
 * is filled by a random draw from the teams not already assigned, preferring
 * those ranked below the seeded band (#25+ for 8 alliances of 3 named seats).
 */
export const computeSeededAlliances = (
  sourceRankings: Ranking[] | undefined,
  seedMap: number[][],
  allianceCount: number,
  allianceSize: number
): PulledAlliance[] => {
  if (!sourceRankings || sourceRankings.length === 0 || allianceCount <= 0) {
    return [];
  }

  const teamByRank = new Map<number, number>();
  for (const r of sourceRankings) teamByRank.set(r.rank, r.teamKey);

  const picked = new Set<number>();
  const rows: PulledAlliance[] = [];
  for (let i = 0; i < allianceCount; i++) {
    const seatRanks = seedMap[i] ?? [];
    const teamKeys: number[] = [];
    for (let j = 0; j < allianceSize; j++) {
      const teamKey =
        seatRanks[j] != null ? teamByRank.get(seatRanks[j]) : undefined;
      if (teamKey != null && !picked.has(teamKey)) {
        picked.add(teamKey);
        teamKeys.push(teamKey);
      } else {
        teamKeys.push(-1); // filled from the pool below
      }
    }
    rows.push({
      allianceRank: i + 1,
      sourceAllianceRank: i + 1,
      standing: i + 1,
      hasStandings: true,
      allianceNameLong: '',
      allianceNameShort: '',
      teamKeys
    });
  }

  // Random-draw pool for the unnamed seats: shuffle the teams ranked below the
  // seeded band (#25+ for 8 alliances of 3 named seats), then any other
  // unassigned team as a fallback.
  const shuffle = <T>(items: T[]): T[] => {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
  const seededBand = allianceCount * Math.max(1, allianceSize - 1);
  const unpicked = sourceRankings.filter((r) => !picked.has(r.teamKey));
  const fillOrder = [
    ...shuffle(unpicked.filter((r) => r.rank > seededBand)),
    ...shuffle(unpicked.filter((r) => r.rank <= seededBand))
  ].map((r) => r.teamKey);
  let fillIdx = 0;
  for (const row of rows) {
    row.teamKeys = row.teamKeys.map((k) => {
      if (k !== -1) return k;
      while (fillIdx < fillOrder.length && picked.has(fillOrder[fillIdx])) {
        fillIdx += 1;
      }
      const fill = fillOrder[fillIdx];
      if (fill != null) {
        picked.add(fill);
        fillIdx += 1;
        return fill;
      }
      return -1;
    });
  }

  return rows;
};
