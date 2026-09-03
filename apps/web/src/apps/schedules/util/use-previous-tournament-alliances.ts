import {
  AllianceMember,
  FGCSchedule,
  Ranking,
  ScheduleParams,
  Tournament,
  getDefaultPlayoffStructureKey,
  getPlayoffStructure,
  getSeasonKeyFromEventKey
} from '@toa-lib/models';
import { useMemo } from 'react';
import { allianceApi } from 'src/api/use-alliance-data.js';
import { rankingsApi } from 'src/api/use-ranking-data.js';
import { useTournamentsForEvent } from 'src/api/use-tournament-data.js';
import {
  PulledAlliance,
  computePulledAlliances,
  computeSeededAlliances,
  findPreviousTournaments
} from './previous-tournament.js';

/** How a set of pulled alliances was derived. */
export type PullMode =
  | 'none' // nothing to pull from that tournament
  | 'carry' // it already had alliances (e.g. Round Robin -> Finals)
  | 'seed'; // built from its rankings via the seed table (quals -> Round Robin, Table 6-1)

export interface PullResult {
  alliances: PulledAlliance[];
  mode: PullMode;
}

export interface PreviousTournamentSources {
  /** Earlier tournaments this schedule can be seeded from, best first. */
  candidates: Tournament[];
  /** How many alliances to build (schedule's count, else the structure default). */
  take: number;
  /** Teams per alliance. */
  allianceSize: number;
  /** Serpentine seed table (FGC Table 6-1) - only set for FIRST Global events. */
  seedMap?: number[][];
}

/**
 * Derives, from the schedule being edited, which earlier tournaments its
 * alliances can be pulled from and the parameters a pull needs. Pure
 * derivation - the actual fetch happens in {@link pullAlliancesFromTournament}.
 */
export const usePreviousTournamentSources = (
  eventSchedule: ScheduleParams | undefined
): PreviousTournamentSources => {
  const { data: tournaments } = useTournamentsForEvent(eventSchedule?.eventKey);

  // Resolve the current tournament from the schedule being edited rather than
  // the global tournamentKey/eventKey atoms - eventKeyAtom is not set inside
  // Schedule Manager, so useCurrentTournament() returns undefined here.
  const candidates = useMemo(() => {
    const current = tournaments?.find(
      (t) => t.tournamentKey === eventSchedule?.tournamentKey
    );
    return findPreviousTournaments(current, tournaments);
  }, [tournaments, eventSchedule?.tournamentKey]);

  const take =
    eventSchedule?.options.allianceCount ??
    getPlayoffStructure(
      getDefaultPlayoffStructureKey(eventSchedule?.type ?? 'Finals') ?? ''
    )?.allianceCount ??
    3;

  const allianceSize = eventSchedule?.options.teamsPerAlliance || 4;

  // FGC serpentine seed table (Table 6-1). Identical across FGC years; only
  // applied for a FIRST Global event.
  const seedMap = useMemo(() => {
    const seasonKey = eventSchedule?.eventKey
      ? getSeasonKeyFromEventKey(eventSchedule.eventKey)
      : '';
    return seasonKey.startsWith('fgc')
      ? FGCSchedule.FGC2026.fgcAllianceOrder
      : undefined;
  }, [eventSchedule?.eventKey]);

  return { candidates, take, allianceSize, seedMap };
};

/**
 * Fetches a source tournament's alliances/rankings and turns them into
 * ready-to-review alliances: carry its saved alliances if it has any, else
 * (FGC quals/ranking source) seed from its rankings via Table 6-1.
 */
export const pullAlliancesFromTournament = async (
  eventKey: string,
  source: Tournament,
  opts: { take: number; allianceSize: number; seedMap?: number[][] }
): Promise<PullResult> => {
  const [sourceAlliances, sourceRankings] = await Promise.all([
    allianceApi.get
      .members(eventKey, source.tournamentKey)
      .catch(() => [] as AllianceMember[]),
    rankingsApi.get
      .tournamentRankings(eventKey, source.tournamentKey)
      .catch(() => [] as Ranking[])
  ]);

  if (sourceAlliances && sourceAlliances.length > 0) {
    return {
      alliances: computePulledAlliances(
        sourceAlliances,
        sourceRankings,
        opts.take
      ),
      mode: 'carry'
    };
  }

  const isQualPhase =
    source.tournamentType === 'Ranking' ||
    source.tournamentType === 'Qualification';
  if (isQualPhase && opts.seedMap && sourceRankings && sourceRankings.length) {
    return {
      alliances: computeSeededAlliances(
        sourceRankings,
        opts.seedMap,
        opts.take,
        opts.allianceSize
      ),
      mode: 'seed'
    };
  }

  return { alliances: [], mode: 'none' };
};
