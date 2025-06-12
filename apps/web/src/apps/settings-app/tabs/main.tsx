import { FC } from 'react';
import { updateSocketClient } from 'src/api/use-socket-data.js';
import { useCurrentTournament } from 'src/api/use-tournament-data.js';
import { isAudioEnabledForScorekeeper } from 'src/stores/state/ui.js';
import { useAtom } from 'jotai';
import BooleanRow from 'src/components/settings/boolean-row.js';
import DropdownRow from 'src/components/settings/dropdown-row.js';
import { Space } from 'antd';

const MainSettingsTab: FC = () => {
  // const [fieldControl, setFieldControl] = useActiveFields();
  const [enableScorekeeperAudio, setScorekeeperAudioEnabled] = useAtom(
    isAudioEnabledForScorekeeper
  );

  const tournament = useCurrentTournament();

  const handleFieldChange = (value: string[]) => {
    if (!tournament) return;
    // setFieldControl(tournament.fields.filter((f) => value.includes(f)));
  };

  let fieldIdTimeout: any = null;
  const updateFieldControl = (value: any[]) => {
    if (!tournament) return;
    handleFieldChange(value);
    // Don't hammer the server with requests
    const fields = tournament.fields.filter((f) => value.includes(f));
    if (fieldIdTimeout !== null) clearTimeout(fieldIdTimeout);
    fieldIdTimeout = setTimeout(() => {
      updateSocketClient(localStorage.getItem('persistantClientId') ?? '', {
        fieldNumbers: fields
      });
    }, 1000);
  };

  return (
    <Space direction='vertical' style={{ width: '100%' }}>
      <DropdownRow
        title='Field Control'
        value={"TODO: Make this work"} // fieldControl.map((f) => f)}
        options={tournament?.fields?.map((f) => ({label: f, value: f})) ?? []}
        onChange={updateFieldControl}
        multiple
      />
      <BooleanRow
        title='Scorekeeper Audio'
        value={enableScorekeeperAudio}
        onChange={setScorekeeperAudioEnabled}
      />
    </Space>
  );
};

export default MainSettingsTab;
