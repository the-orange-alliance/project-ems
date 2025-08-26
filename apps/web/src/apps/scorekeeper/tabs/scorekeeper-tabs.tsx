import { FC, useEffect, useState } from 'react';
import { Tabs, Divider, Card } from 'antd';
import { TabPanel } from 'src/components/util/tab-panel.js';
import { ScorekeeperMatches } from './scorekeeper-matches.js';
import { useMatchControl } from '../hooks/use-match-control.js';
import { MatchState } from '@toa-lib/models';
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
import { useMatchesForTournament } from 'src/api/use-match-data.js';

interface Props {
  eventKey?: string;
}

export const ScorekeeperTabs: FC<Props> = ({eventKey}) => {
  const { canPrestart, setState } = useMatchControl();
  const [tournamentKey, setTournamentKey] = useAtom(tournamentKeyAtom);
  const [matchId, setMatchId] = useAtom(matchIdAtom);
  const [value, setValue] = useState(0);
  const setMatchOccurring = useSetAtom(matchAtom);
  const [activeFields] = useActiveFieldNumbers();

  const {
    state: {
      local: { teams, tournaments }
    }
  } = useEventState({ matches: true, teams: true, tournaments: true });
  const {data: tournamentMatches} = useMatchesForTournament(eventKey, tournamentKey)

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
    if (!tournamentMatches) return null;
    setMatchOccurring(tournamentMatches.find((m) => m.id === id) ?? null);
    setState(MatchState.PRESTART_READY);
  };

  return (
    <Card style={{ width: '100%' }} styles={{body: { padding: 0 }}}>
      <Tabs
        activeKey={String(value)}
        size='large'
        style={{ marginLeft: 8, marginRight: 8 }}
        onChange={handleChange}
        items={[
          {
            key: '0',
            label: 'Schedule',
            children: (
              <TabPanel value={value} index={0}>
                <ScorekeeperMatches
                  matches={tournamentMatches?.filter((m) => activeFields.includes(m.fieldNumber) )}
                  teams={teams}
                  tournaments={tournaments}
                  tournamentKey={tournamentKey}
                  selected={(match) => match.id === matchId}
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
              <TabPanel value={value} index={1}>
                <ScorekeeperDetails />
              </TabPanel>
            )
          },
          {
            key: '2',
            label: 'Options',
            children: (
              <TabPanel value={value} index={2}>
                <ScorekeeperOptions />
              </TabPanel>
            )
          }
        ]}
      />
      <Divider style={{ margin: 0 }} />
    </Card>
  );
};
