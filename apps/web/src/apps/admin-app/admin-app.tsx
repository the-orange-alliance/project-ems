import { FC } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { Button, Divider, Typography, Space } from 'antd';
import { rankingsApi } from 'src/api/use-ranking-data.js';
import { resultsSyncApi } from 'src/api/use-results-sync.js';
import { eventsApi } from 'src/api/use-event-data.js';
import { eventKeyAtom, tournamentKeyAtom } from 'src/stores/state/event.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';
import { EventTournamentsDropdown } from 'src/components/dropdowns/event-tournaments-dropdown.js';
import { isPlayoffsTournament, Tournament } from '@toa-lib/models';
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
    await resultsSyncApi.create.matches(
      eventKey,
      tournamentKey,
      platform,
      apiKey
    );
  };

  const syncRankings = async (): Promise<void> => {
    if (!eventKey || !tournamentKey) return;
    await resultsSyncApi.create.rankings(
      eventKey,
      tournamentKey,
      platform,
      apiKey
    );
  };

  const syncAlliances = async (): Promise<void> => {
    if (!eventKey || !tournamentKey) return;
    await resultsSyncApi.create.alliances(
      eventKey,
      tournamentKey,
      platform,
      apiKey
    );
  };

  const handlePurge = async (): Promise<void> => {
    try {
      await eventsApi.setup.delete.purgeAll();
    } catch (e) {
      console.log(e);
    }
  };

  const handleRankingsCreate = async () => {
    if (!tournamentKey || !teams) return;
    await rankingsApi.create.rankingsForTournament(tournamentKey, teams);
  };

  const handleRankings = async () => {
    if (!tournamentKey || !tournaments) return;
    const tournament = tournaments.find(
      (t) => t.tournamentKey === tournamentKey
    );
    if (!tournament) return;
    // FGC2024 SPECIFIC
    if (isPlayoffsTournament(tournament)) {
      await rankingsApi.create.recalculate(
        tournament.eventKey,
        tournament.tournamentKey,
        true
      );
    } else {
      await rankingsApi.create.recalculate(
        tournament.eventKey,
        tournament.tournamentKey
      );
    }
  };

  const handleRankingsDelete = async () => {
    if (!tournamentKey || !eventKey) return;
    await rankingsApi.delete.rankings(eventKey, tournamentKey);
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
