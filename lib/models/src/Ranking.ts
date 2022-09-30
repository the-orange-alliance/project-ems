import { Team } from './Team';
import { isNonNullObject, isNumber, isString } from './types';

export interface Ranking {
  rankKey: string;
  teamKey: number;
  rank: number;
  rankChange: number;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  allianceKey: string;
  team?: Team;
}

export const isRanking = (obj: unknown): obj is Ranking =>
  isNonNullObject(obj) &&
  isNumber(obj.rankKey) &&
  isNumber(obj.teamKey) &&
  isNumber(obj.rank) &&
  isNumber(obj.rankChange) &&
  isNumber(obj.played) &&
  isNumber(obj.wins) &&
  isNumber(obj.losses) &&
  isNumber(obj.ties) &&
  isString(obj.allianceKey);

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
