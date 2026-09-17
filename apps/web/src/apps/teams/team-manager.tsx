import { useModal } from '@ebay/nice-modal-react';
import { Space, Typography } from 'antd';
import { Team, defaultTeam, teamZod } from '@toa-lib/models';
import { ChangeEvent, FC, Suspense, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resultsSyncApi } from 'src/api/use-results-sync.js';
import { teamsApi } from 'src/api/use-team-data.js';
import { TeamRemovalDialog } from 'src/components/dialogs/team-removal-dialog.js';
import { TeamsTable } from 'src/components/tables/teams-table.js';
import { useSnackbar } from 'src/hooks/use-snackbar.js';
import { useSyncConfig } from 'src/hooks/use-sync-config.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import { getDifferences } from 'src/stores/array-utils.js';
import { parseTeamsFile } from 'src/util/file-parser.js';
import { MoreButton } from 'src/components/buttons/more-button.js';
import { TwoColumnHeader } from 'src/components/util/two-column-header.js';
import { useEventState } from 'src/stores/hooks/use-event-state.js';
import { useUpdateAppbar } from 'src/hooks/use-update-appbar.js';
import { UploadButton } from 'src/components/buttons/upload-button.js';
import { Shortcut } from 'src/components/util/shortcuts.js';
import { useAtomValue } from 'jotai';
import { remoteApiUrlAtom } from 'src/stores/state/ui.js';
import { normalizeRemoteApiHost } from 'src/util/remote-api-host.js';
import { remoteClient } from 'src/api/http-clients.js';

export const TeamManager: FC = () => {
  const { loading, state } = useEventState({
    event: true,
    teams: true
  });
  const {
    setModifiedTeams,
    local: { event, teams }
  } = state;

  const { platform, apiKey } = useSyncConfig();
  const { showSnackbar, showErrorSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const removeModal = useModal(TeamRemovalDialog);

  const remoteUrl = useAtomValue(remoteApiUrlAtom);

  // Team Manager stages every add/edit/delete locally; nothing is persisted
  // until "Save Teams". Warn before a reload/close/external navigation would
  // silently discard staged changes.
  const hasUnsavedChanges = state.staged.teams.length > 0;
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  useUpdateAppbar(
    {
      title: event ? `${event.eventName} | Team Manager` : undefined,
      titleLink: event ? `/${event.eventKey}` : undefined
    },
    [event]
  );

  const handleSave = async () => {
    try {
      if (!event) return;
      const diffs = getDifferences(
        state.local.teams,
        state.remote.teams,
        'teamKey'
      );
      if (diffs.additions.length > 0) {
        await teamsApi.create.teams(event.eventKey, diffs.additions);
      }
      for (const team of diffs.edits) {
        await teamsApi.update.team(team.eventKey, team.teamKey, team);
      }
      await resultsSyncApi.create.teams(event.eventKey, platform, apiKey);

      setModifiedTeams([]);

      showSnackbar(
        `(${
          diffs.additions.length + diffs.edits.length
        }) Teams successfully uploaded`
      );
    } catch (e) {
      showErrorSnackbar('Error while uploading team.', e);
    }
  };

  const handleAdd = () => {
    if (!event) return;
    const { eventKey } = event;
    setModifiedTeams((prev) => [
      { ...defaultTeam, eventKey, teamKey: state.local.teams.length + 1 },
      ...prev
    ]);
  };

  const handleAddTest = () => {
    if (!event) return;
    const { eventKey } = event;
    // Array of random ISO 3-digit country codes to use for test teams
    const countryCodes = [
      'US',
      'CA',
      'GB',
      'AU',
      'DE',
      'FR',
      'IT',
      'ES',
      'NL',
      'SW'
    ];
    const randCountry =
      countryCodes[Math.floor(Math.random() * countryCodes.length)];
    const nextNumber = state.local.teams.length + 1;
    setModifiedTeams((prev) => [
      {
        ...defaultTeam,
        eventKey,
        teamKey: nextNumber,
        teamNumber: `${nextNumber}`,
        countryCode: randCountry,
        teamNameShort: `Test ${prev.length + 1} (${randCountry})`
      },
      ...prev
    ]);
  };

  const handleUpload = async (
    e: ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const { files } = e.target;
    if (!files || files.length <= 0 || !event) return;
    e.preventDefault();
    const importedTeams = await parseTeamsFile(files[0], event.eventKey);
    setModifiedTeams(importedTeams);
  };

  const handleRevert = async () => {
    if (!event) return;
    setModifiedTeams([]);
  };

  const handleEdit = (team: Team) => {
    if (!event) return;
    navigate(`/${event.eventKey}/team-manager/edit/${team.teamKey}`);
  };

  const handleDelete = async (team: Team) => {
    const confirmRemove = await removeModal.show({ team });
    if (confirmRemove) {
      setModifiedTeams((prevTeams) =>
        prevTeams.filter((t) => t.teamKey !== team.teamKey)
      );
    }
  };

  const handleDownload = async () => {
    try {
      if (!event?.eventKey) return;
      remoteClient.setBaseUrl(normalizeRemoteApiHost(remoteUrl));
      const teams =
        (await remoteClient.get<Team[]>(`/teams/${event.eventKey}`, {
          schema: teamZod.array()
        })) ?? [];
      setModifiedTeams(teams);
      showSnackbar(`(${teams.length}) Teams successfully downloaded`);
    } catch (e) {
      showErrorSnackbar('Error while downloading teams.', e);
    }
  };

  return (
    <PaperLayout
      containerWidth='xl'
      header={
        <TwoColumnHeader
          left={<Typography.Title level={3}>Team Manager</Typography.Title>}
          right={
            <MoreButton
              menuItems={[
                { key: '1', label: <a onClick={handleSave}>Save Teams</a> },
                {
                  key: '2',
                  label: (
                    <Shortcut
                      action={handleAdd}
                      shortcut='Alt + A'
                      disableShortcut // disable the handler for the shortcut, but still render the button and accept clicks
                      label='Add Team'
                    />
                  )
                },
                {
                  key: '3',
                  label: (
                    <Shortcut
                      action={handleAddTest}
                      shortcut='Alt + T'
                      disableShortcut // disable the handler for the shortcut, but still render the button and accept clicks
                      label='Add Test Team'
                    />
                  )
                },
                {
                  key: '4',
                  label: (
                    <UploadButton title='Upload File' onUpload={handleUpload} />
                  )
                },
                {
                  key: '6',
                  label: <a onClick={handleDownload}>Download Teams</a>
                },
                {
                  key: '5',
                  label: <a onClick={handleRevert}>Revert Changes</a>
                }
              ]}
            />
          }
        />
      }
      showSettings
    >
      <Suspense>
        {event && (
          <Space direction='vertical' style={{ width: '100%' }}>
            <Shortcut disableRender action={handleAdd} shortcut='alt + a' />
            <Shortcut disableRender action={handleAddTest} shortcut='alt + t' />
            <Space>
              <Typography.Text>{teams.length} Teams</Typography.Text>
              {hasUnsavedChanges && (
                <Typography.Text type='warning' strong>
                  • Unsaved changes — choose “Save Teams” to persist
                </Typography.Text>
              )}
            </Space>
            <TeamsTable
              event={event}
              teams={teams}
              onEdit={handleEdit}
              onDelete={handleDelete}
              loading={loading}
            />
          </Space>
        )}
      </Suspense>
    </PaperLayout>
  );
};
