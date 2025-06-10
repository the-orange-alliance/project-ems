import { FC } from 'react';
import { SyncPlatform, TeamKeys, TeamKeysLables } from '@toa-lib/models';
import { APIOptions } from '@toa-lib/client';
import { updateSocketClient } from 'src/api/use-socket-data.js';
import { Space } from 'antd';
import BooleanRow from 'src/components/settings/boolean-row.js';
import { useAtom } from 'jotai';
import { darkModeAtom, followerHostAtom, isFollowerAtom, syncApiKeyAtom, syncPlatformAtom, teamIdentifierAtom } from 'src/stores/state/ui.js';
import DropdownRow from 'src/components/settings/dropdown-row.js';
import { PaperLayout } from 'src/layouts/paper-layout.js';
import ButtonRow from 'src/components/settings/button-row.js';
import InputRow from 'src/components/settings/input-row.js';

const Settings: FC = () => {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom);
  const [teamIdentifier, setTeamIdentifier] =
    useAtom(teamIdentifierAtom);
  const [followerMode, setFollowerMode] = useAtom(
    isFollowerAtom
  );
  const [leaderApiHost, setLeaderApiHost] = useAtom(followerHostAtom);
  const [syncPlatform, setSyncPlatform] = useAtom(syncPlatformAtom);
  const [syncApiKey, setSyncApiKey] = useAtom(syncApiKeyAtom);

  const handleFollowerModeChange = (value: boolean) => {
    setFollowerMode(value);
    if (!value) {
      setLeaderApiHost('');
      APIOptions.host = `${window.location.hostname}`;
    }
  };

  const handleLeaderAddressChange = (value: string | number) => {
    setLeaderApiHost(value.toString());
    APIOptions.host = `http://${value.toString()}`;
  };

  let followTimeout: any = null;
  const updateFollowerMode = (value: boolean) => {
    handleFollowerModeChange(value);

    // Don't hammer the server with requests
    if (followTimeout !== null) clearTimeout(followTimeout);
    followTimeout = setTimeout(() => {
      updateSocketClient(localStorage.getItem('persistantClientId') ?? '', {
        followerMode: value ? 1 : 0
      });
    }, 1000);
  };

  let leaderApiHostTimeout: any = null;
  const updateFollowerApiHost = (value: string | number) => {
    handleLeaderAddressChange(value);

    // Don't hammer the server with requests
    if (leaderApiHostTimeout !== null) clearTimeout(leaderApiHostTimeout);
    leaderApiHostTimeout = setTimeout(() => {
      updateSocketClient(localStorage.getItem('persistantClientId') ?? '', {
        followerApiHost: value
      });
    }, 1000);
  };

  const handleClear = () => localStorage.clear();

  return (
    <Space direction='vertical' style={{ width: '100%' }}>
      <BooleanRow
        title='Dark Mode'
        value={darkMode}
        onChange={setDarkMode}
      />
      <DropdownRow
        title='Team Identifier'
        value={teamIdentifier}
        options={TeamKeys.map((key) => ({value: key, label: TeamKeysLables[key]}))}
        onChange={setTeamIdentifier}
      />
      <BooleanRow
        title='Follower Mode'
        value={followerMode}
        onChange={updateFollowerMode}
      />
      <InputRow
        title='Leader Api Host'
        value={leaderApiHost}
        onChange={updateFollowerApiHost}
                disabled={!followerMode}
      />
      <DropdownRow
        title='Sync Platform'
        value={syncPlatform}
        options={[
          { value: SyncPlatform.TOA, label: 'The Orange Alliance' },
          { value: SyncPlatform.TBA, label: 'The Blue Alliance' },
          { value: SyncPlatform.FGC, label: 'FIRST Global API' },
          { value: SyncPlatform.DISABLED, label: 'Disabled' },
        ]}
        onChange={setSyncPlatform}
              />
      <InputRow
        title='Sync Key'
        value={syncApiKey}
        onChange={(s) => setSyncApiKey(String(s))}
      />
      <ButtonRow
        title='Clear Cache'
        buttonText='Clear'
        color='danger'
        onClick={handleClear}
      />
    </Space>
  );
};

export const GlobalSettingsApp: FC = () => {
  return (
    <PaperLayout header={'Global Settings'}>
        <Settings />
    </PaperLayout>
  );
};
