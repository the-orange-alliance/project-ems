import { FC } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Button, Divider, Typography, Space } from 'antd';
import {
  createRankings,
  recalculateRankings,
  recalculatePlayoffsRankings,
  deleteRankings
} from 'src/api/use-ranking-data.js';
import {
  resultsSyncAlliances,
  resultsSyncMatches,
  resultsSyncRankings
} from 'src/api/use-results-sync.js';
import { purgeAll } from 'src/api/use-event-data.js';
import { eventKeyAtom, tournamentKeyAtom } from 'src/stores/state/event.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';
import { EventTournamentsDropdown } from 'src/components/dropdowns/event-tournaments-dropdown.js';
import { Tournament } from '@toa-lib/models';
import { useTeamsForEvent } from 'src/api/use-team-data.js';
import { useTournamentsForEvent } from 'src/api/use-tournament-data.js';
import { useSyncConfig } from 'src/hooks/use-sync-config.js';

export const AdminApp: FC = () => {
  const [tournamentKey, setTournamentKey] = useAtom(tournamentKeyAtom);
  const eventKey = useAtomValue(eventKeyAtom);
  const { data: teams } = useTeamsForEvent(eventKey);
  const { data: tournaments } = useTournamentsForEvent(eventKey);
  const { apiKey, platform } = useSyncConfig();

  const handleTournamentChange = (tournament: Tournament | null) => {
    if (!tournament) return;
    setTournamentKey(tournament.tournamentKey);
  };

  const syncMatches = async (): Promise<void> => {
    if (!eventKey || !tournamentKey) return;
    await resultsSyncMatches(eventKey, tournamentKey, platform, apiKey);
  };

  const syncRankings = async (): Promise<void> => {
    if (!eventKey || !tournamentKey) return;
    await resultsSyncRankings(eventKey, tournamentKey, platform, apiKey);
  };

  const syncAlliances = async (): Promise<void> => {
    if (!eventKey || !tournamentKey) return;
    await resultsSyncAlliances(eventKey, tournamentKey, platform, apiKey);
  };

  const handlePurge = async (): Promise<void> => {
    try {
      await purgeAll();
    } catch (e) {
      console.log(e);
    }
  };

  const handleRankingsCreate = async () => {
    if (!tournamentKey || !teams) return;
    await createRankings(tournamentKey, teams);
  };

  const handleRankings = async () => {
    if (!tournamentKey || !tournaments) return;
    const tournament = tournaments.find(
      (t) => t.tournamentKey === tournamentKey
    );
    if (!tournament) return;
    // FGC2024 SPECIFIC
    if (tournamentKey === 't3' || tournamentKey === 't4') {
      await recalculatePlayoffsRankings(
        tournament.eventKey,
        tournament.tournamentKey
      );
    } else {
      await recalculateRankings(tournament.eventKey, tournament.tournamentKey);
    }
  };

  const handleRankingsDelete = async () => {
    if (!tournamentKey || !eventKey) return;
    await deleteRankings(eventKey, tournamentKey);
  };

  return (
    <PaperLayout
      header={
        <TwoColumnHeader
          left={<Typography.Title level={2}>Admin App</Typography.Title>}
          right={
            <EventTournamentsDropdown
              eventKey={eventKey || ''}
              value={tournamentKey}
              onChange={handleTournamentChange}
            />
          }
        />
      }
    >
      <Divider />
      <Space direction='vertical' size='large' style={{ padding: 16 }}>
        <Button type='primary' danger onClick={syncMatches}>
          Sync Matches
        </Button>
        <Button type='primary' danger onClick={syncRankings}>
          Sync Rankings
        </Button>
        <Button type='primary' danger onClick={syncAlliances}>
          Sync Alliances
        </Button>
        <Button type='primary' danger onClick={handleRankingsCreate}>
          Create Rankings
        </Button>
        <Button type='primary' danger onClick={handleRankings}>
          Re-Calculate Rankings
        </Button>
        <Button type='primary' danger onClick={handleRankingsDelete}>
          Delete Rankings
        </Button>
        <Button type='primary' danger onClick={handlePurge}>
          Purge Event Data
        </Button>
      </Space>
    </PaperLayout>
  );
};
