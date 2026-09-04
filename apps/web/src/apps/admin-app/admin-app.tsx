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
import { useSnackbar } from 'src/hooks/use-snackbar.js';

export const AdminApp: FC = () => {
  const [tournamentKey, setTournamentKey] = useAtom(tournamentKeyAtom);
  const eventKey = useAtomValue(eventKeyAtom);
  const { data: teams } = useTeamsForEvent(eventKey);
  const { data: tournaments } = useTournamentsForEvent(eventKey);
  const { apiKey, platform } = useSyncConfig();
  const { showSnackbar, showErrorSnackbar } = useSnackbar();

  // Every Admin action is fire-and-forget with no visible result otherwise.
  // Wrap each one so it always reports success or the error.
  const CANCELLED = Symbol('cancelled');
  const run = (label: string, action: () => Promise<unknown>) => async () => {
    try {
      const result = await action();
      if (result !== CANCELLED) showSnackbar(`${label} completed.`);
    } catch (e) {
      showErrorSnackbar(`${label} failed.`, e);
    }
  };

  const handleTournamentChange = (tournament: Tournament | null) => {
    if (!tournament) return;
    setTournamentKey(tournament.tournamentKey);
  };

  const syncMatches = run('Sync Matches', async () => {
    if (!eventKey || !tournamentKey)
      throw new Error('Select a tournament first.');
    await resultsSyncApi.create.matches(
      eventKey,
      tournamentKey,
      platform,
      apiKey
    );
  });

  const syncRankings = run('Sync Rankings', async () => {
    if (!eventKey || !tournamentKey)
      throw new Error('Select a tournament first.');
    await resultsSyncApi.create.rankings(
      eventKey,
      tournamentKey,
      platform,
      apiKey
    );
  });

  const syncAlliances = run('Sync Alliances', async () => {
    if (!eventKey || !tournamentKey)
      throw new Error('Select a tournament first.');
    await resultsSyncApi.create.alliances(
      eventKey,
      tournamentKey,
      platform,
      apiKey
    );
  });

  const handlePurge = run('Purge Event Data', async () => {
    if (
      !window.confirm(
        'Permanently wipe ALL data for this event (teams, tournaments, schedules, matches, rankings)? This cannot be undone.'
      )
    ) {
      return CANCELLED;
    }
    await eventsApi.setup.delete.purgeAll();
  });

  const handleRankingsCreate = run('Create Rankings', async () => {
    if (!tournamentKey || !teams) throw new Error('Select a tournament first.');
    await rankingsApi.create.rankingsForTournament(tournamentKey, teams);
  });

  const handleRankings = run('Re-Calculate Rankings', async () => {
    if (!tournamentKey || !tournaments)
      throw new Error('Select a tournament first.');
    const tournament = tournaments.find(
      (t) => t.tournamentKey === tournamentKey
    );
    if (!tournament) throw new Error('Select a tournament first.');
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
  });

  const handleRankingsDelete = run('Delete Rankings', async () => {
    if (!tournamentKey || !eventKey)
      throw new Error('Select a tournament first.');
    if (
      !window.confirm(
        `Delete all rankings for ${tournamentKey}? "Re-Calculate Rankings" can rebuild them from match results.`
      )
    ) {
      return CANCELLED;
    }
    await rankingsApi.delete.rankings(eventKey, tournamentKey);
  });

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
