import { Team, teamZod } from './Team.js';
import { z } from 'zod';

export type CompareFn = (a: Ranking, b: Ranking) => number;

export const rankingZod = z.object({
  eventKey: z.string(),
  tournamentKey: z.string(),
  teamKey: z.number(),
  rank: z.number(),
  rankChange: z.number(),
  played: z.number(),
  wins: z.number(),
  losses: z.number(),
  ties: z.number(),
  team: teamZod.optional()
});

export type Ranking = z.infer<typeof rankingZod>;

export function reconcileTeamRankings(
  teams: Team[],
  rankings: Ranking[]
): Ranking[] {
  const map: Map<number, Team> = new Map();
  for (const team of teams) {
    map.set(team.teamKey, team);
  }

  const newRankings: Ranking[] = [];
  for (const ranking of rankings) {
    newRankings.push({ ...ranking, team: map.get(ranking.teamKey) });
  }

  return newRankings;
}

export function sortRankings(
  rankings: Ranking[],
  compareFn: CompareFn
): Ranking[] {
  return rankings.slice().sort(compareFn);
}
