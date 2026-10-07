import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, Card } from 'antd';
import { TabPanel } from 'src/components/util/tab-panel.js';
import { ScorekeeperMatches } from './scorekeeper-matches.js';
import { useMatchControl } from '../hooks/use-match-control.js';
import { Match, MatchState } from '@toa-lib/models';
import { ScorekeeperDetails } from './scorekeeper-details.js';
import { useActiveFieldNumbers } from 'src/components/sync-effects/sync-fields.js';
import { ScorekeeperOptions } from './scorekeeper-options.js';
import { useAtom, useSetAtom } from 'jotai';
import {
  matchAtom,
  matchIdAtom,
  tournamentKeyAtom
} from 'src/stores/state/event.js';
import { useEventState } from 'src/stores/hooks/use-event-state.js';
import { matchApi, useMatchesForTournament } from 'src/api/use-match-data.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';

interface Props {
  eventKey?: string;
}

export const ScorekeeperTabs: FC<Props> = ({ eventKey }) => {
  const { canPrestart, setState } = useMatchControl();
  const [tournamentKey, setTournamentKey] = useAtom(tournamentKeyAtom);
  const [matchId, setMatchId] = useAtom(matchIdAtom);
  const [value, setValue] = useState(0);
  const [loadingMatch, setLoadingMatch] = useState(false);
  const requestedMatchId = useRef<number | null>(null);
  const setMatchOccurring = useSetAtom(matchAtom);
  const [activeFields] = useActiveFieldNumbers();
  const { showErrorSnackbar } = useSnackbar();

  // The event's full match list isn't needed here; only the selected match is
  // kept in state, which keeps every match lookup cheap.
  const {
    state: {
      local: { teams, tournaments }
    }
  } = useEventState({ teams: true, tournaments: true });
  const { data: tournamentMatches } = useMatchesForTournament(
    eventKey,
    tournamentKey
  );
  const fieldMatches = useMemo(
    () =>
      tournamentMatches?.filter((m) => activeFields.includes(m.fieldNumber)),
    [tournamentMatches, activeFields]
  );
  const isSelected = useCallback(
    (match: Match<any>) => match.id === matchId,
    [matchId]
  );

  useEffect(() => {
    setValue(0);
  }, [tournamentKey]);

  const handleChange = (key: string) => setValue(Number(key));
  const handleTournamentChange = (key: string) => {
    setTournamentKey(key);
    setMatchId(null);
    setState(MatchState.MATCH_NOT_SELECTED);
  };
  const handleMatchChange = (id: number) => {
    if (!tournamentMatches || !tournamentKey || !eventKey) return;
    requestedMatchId.current = id;
    // Show the schedule's copy right away; the full match (details) replaces it.
    setMatchOccurring(tournamentMatches.find((m) => m.id === id) ?? null);
    setState(MatchState.PRESTART_READY);
    setLoadingMatch(true);
    matchApi.get
      .all(eventKey, tournamentKey, id)
      .then((fullMatch) => {
        if (requestedMatchId.current === id) setMatchOccurring(fullMatch);
      })
      .catch((e) => showErrorSnackbar('Error while loading match.', e))
      .finally(() => {
        if (requestedMatchId.current === id) setLoadingMatch(false);
      });
  };

  return (
    <Card style={{ width: '100%' }} styles={{ body: { padding: '0 16px' } }}>
      <Tabs
        activeKey={String(value)}
        onChange={handleChange}
        items={[
          {
            key: '0',
            label: 'Schedule',
            children: (
              <TabPanel value={value} index={0} noPadding>
                <ScorekeeperMatches
                  matches={fieldMatches}
                  teams={teams}
                  tournaments={tournaments}
                  tournamentKey={tournamentKey}
                  loading={loadingMatch}
                  selected={isSelected}
                  onTournamentChange={handleTournamentChange}
                  onMatchSelect={handleMatchChange}
                  disabled={!canPrestart && matchId !== null}
                />
              </TabPanel>
            )
          },
          {
            key: '1',
            label: 'Score Details',
            children: (
              <TabPanel value={value} index={1} noPadding>
                <ScorekeeperDetails />
              </TabPanel>
            )
          },
          {
            key: '2',
            label: 'Options',
            children: (
              <TabPanel value={value} index={2} noPadding>
                <ScorekeeperOptions />
              </TabPanel>
            )
          }
        ]}
      />
    </Card>
  );
};
