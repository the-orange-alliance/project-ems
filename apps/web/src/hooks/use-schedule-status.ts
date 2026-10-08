import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { useMatchesForTournament } from 'src/api/use-match-data.js';
import {
  eventKeyAtom,
  matchAtom,
  tournamentKeyAtom
} from 'src/stores/state/event.js';
import {
  ScheduleStatus,
  analyzeSchedule,
  getScheduleStatus
} from 'src/util/schedule-status.js';
import { useNow } from './use-now.js';

const REFRESH_INTERVAL_MS = 60_000;

/**
 * How far ahead or behind the tournament schedule is right now, plus cycle
 * time statistics, from the matches' scheduled and actual start times. Null
 * until a tournament's matches have loaded.
 */
export const useScheduleStatus = (): ScheduleStatus | null => {
  const eventKey = useAtomValue(eventKeyAtom);
  const tournamentKey = useAtomValue(tournamentKeyAtom);
  const { data: matches } = useMatchesForTournament(eventKey, tournamentKey, {
    refreshInterval: REFRESH_INTERVAL_MS,
    revalidateOnFocus: true
  });
  const selected = useAtomValue(matchAtom);
  const now = useNow();

  // The selected match is updated live over the socket, ahead of the list.
  const analysis = useMemo(() => {
    if (!matches) return null;
    return analyzeSchedule(
      selected
        ? matches.map((m) =>
            m.id === selected.id
              ? {
                  ...m,
                  actualStartTime: selected.actualStartTime,
                  prestartTime: selected.prestartTime,
                  result: selected.result
                }
              : m
          )
        : matches
    );
  }, [
    matches,
    selected?.id,
    selected?.actualStartTime,
    selected?.prestartTime,
    selected?.result
  ]);

  return useMemo(
    () => (analysis ? getScheduleStatus(analysis, now) : null),
    [analysis, now]
  );
};
