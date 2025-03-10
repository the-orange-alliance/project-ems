import { FC } from 'react';
import Box from '@mui/material/Box';
import { useRecoilState } from 'recoil';
import {
  darkModeAtom,
  followerModeEnabledAtom,
  leaderApiHostAtom,
  syncApiKeyAtom,
  syncPlatformAtom,
  teamIdentifierAtom
} from 'src/stores/recoil';
import { SwitchSetting } from './components/switch-setting';
import { DropdownSetting } from './components/dropdown-setting';
import { SyncPlatform, TeamKeys } from '@toa-lib/models';
import { TextSetting } from './components/text-setting';
import { APIOptions } from '@toa-lib/client';
import { updateSocketClient } from 'src/api/use-socket-data';
import { DefaultLayout } from '@layouts/default-layout';
import { Paper } from '@mui/material';
import { ButtonSetting } from './components/button-setting';

const Settings: FC = () => {
  const [darkMode, setDarkMode] = useRecoilState(darkModeAtom);
  const [teamIdentifier, setTeamIdentifier] =
    useRecoilState(teamIdentifierAtom);
  const [followerMode, setFollowerMode] = useRecoilState(
    followerModeEnabledAtom
  );
  const [leaderApiHost, setLeaderApiHost] = useRecoilState(leaderApiHostAtom);
  const [syncPlatform, setSyncPlatform] = useRecoilState(syncPlatformAtom);
  const [syncApiKey, setSyncApiKey] = useRecoilState(syncApiKeyAtom);

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
    <Box>
      <SwitchSetting
        name='Dark Mode'
        value={darkMode}
        onChange={setDarkMode}
        inline
      />
      <DropdownSetting
        name='Team Identifier'
        value={teamIdentifier}
        options={TeamKeys}
        onChange={setTeamIdentifier}
        inline
      />
      <SwitchSetting
        name='Follower Mode'
        value={followerMode}
        onChange={updateFollowerMode}
        inline
      />
      <TextSetting
        name='Leader Api Host'
        value={leaderApiHost}
        onChange={updateFollowerApiHost}
        inline
        disabled={!followerMode}
      />
      <DropdownSetting
        name='Sync Platform'
        value={syncPlatform}
        options={[
          SyncPlatform.DISABLED,
          SyncPlatform.TBA,
          SyncPlatform.FGC,
          SyncPlatform.TOA
        ]}
        onChange={setSyncPlatform}
        inline
      />
      <TextSetting
        name='Sync Key'
        value={syncApiKey}
        onChange={(s) => setSyncApiKey(String(s))}
        inline
      />
      <ButtonSetting
        name='Clear Cache'
        buttonText='Clear'
        color='error'
        onClick={handleClear}
        inline
      />
    </Box>
  );
};

export const GlobalSettingsApp: FC = () => {
  return (
    <DefaultLayout>
      <Paper sx={{ marginBottom: (theme) => theme.spacing(8) }}>
        <Settings />
      </Paper>
    </DefaultLayout>
  );
};
