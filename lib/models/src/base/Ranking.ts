import { Team } from './Team.js';
import { isArray, isNonNullObject, isNumber, isString } from '../types.js';

export type CompareFn = (a: Ranking, b: Ranking) => number;

export interface Ranking {
  eventKey: string;
  tournamentKey: string;
  teamKey: number;
  rank: number;
  rankChange: number;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  team?: Team;
}

export const isRanking = (obj: unknown): obj is Ranking =>
  isNonNullObject(obj) &&
  isString(obj.eventKey) &&
  isString(obj.tournamentKey) &&
  isNumber(obj.teamKey) &&
  isNumber(obj.rank) &&
  isNumber(obj.rankChange) &&
  isNumber(obj.played) &&
  isNumber(obj.wins) &&
  isNumber(obj.losses) &&
  isNumber(obj.ties);

export const isRankingArray = (obj: unknown): obj is Ranking[] =>
  isArray(obj) && obj.every((o) => isRanking(o));

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
