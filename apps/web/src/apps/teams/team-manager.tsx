import { useModal } from '@ebay/nice-modal-react';
import { Space, Typography } from 'antd';
import { Team, defaultTeam } from '@toa-lib/models';
import { ChangeEvent, FC, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { resultsSyncTeams } from 'src/api/use-results-sync.js';
import { getTeams, patchTeam, postTeams } from 'src/api/use-team-data.js';
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
import { APIOptions } from '@toa-lib/client';
import { useAtomValue } from 'jotai';
import { remoteApiUrlAtom } from 'src/stores/state/ui.js';

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
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const removeModal = useModal(TeamRemovalDialog);

  const remoteUrl = useAtomValue(remoteApiUrlAtom);

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
        await postTeams(event.eventKey, diffs.additions);
      }
      for (const team of diffs.edits) {
        await patchTeam(team.eventKey, team.teamKey, team);
      }
      await resultsSyncTeams(event.eventKey, platform, apiKey);

      setModifiedTeams([]);

      showSnackbar(
        `(${
          diffs.additions.length + diffs.edits.length
        }) Teams successfully uploaded`
      );
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while uploading team.', error);
    }
  };

  const handleAdd = () => {
    if (!event) return;
    const { eventKey } = event;
    setModifiedTeams((prev) => [
      { ...defaultTeam, eventKey, teamKey: state.staged.teams.length + 1 },
      ...prev
    ]);
  };

  const handleAddTest = () => {
    if (!event) return;
    const { eventKey } = event;
    // Array of random ISO 3-digit country codes to use for test teams
    const countryCodes = [
      'USA',
      'CAN',
      'GBR',
      'AUS',
      'DEU',
      'FRA',
      'ITA',
      'ESP',
      'NLD',
      'SWE'
    ];
    const randCountry =
      countryCodes[Math.floor(Math.random() * countryCodes.length)];
    setModifiedTeams((prev) => [
      {
        ...defaultTeam,
        eventKey,
        teamKey: state.local.teams.length + 1,
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
      const previousUrl = APIOptions.host;
      APIOptions.host = remoteUrl;
      const teams = await getTeams(event?.eventKey);
      APIOptions.host = previousUrl;
      setModifiedTeams(teams);
      showSnackbar(`(${teams.length}) Teams successfully downloaded`);
    } catch (e) {
      const error = e instanceof Error ? `${e.name} ${e.message}` : String(e);
      showSnackbar('Error while downloading teams.', error);
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
            <Typography.Text>{teams.length} Teams</Typography.Text>
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
