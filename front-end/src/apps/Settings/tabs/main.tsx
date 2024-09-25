import { FC } from 'react';
import Box from '@mui/material/Box';
import { useRecoilState } from 'recoil';
import {
  darkModeAtom,
  followerModeEnabledAtom,
  leaderApiHostAtom,
  scorekeeperAudioEnabledAtom,
  teamIdentifierAtom
} from 'src/stores/recoil';
import { SwitchSetting } from '../components/switch-setting';
import { DropdownSetting } from '../components/dropdown-setting';
import { TeamKeys } from '@toa-lib/models';
import { MultiSelectSetting } from '../components/multi-select-setting';
import { TextSetting } from '../components/text-setting';
import { APIOptions } from '@toa-lib/client';
import { updateSocketClient } from 'src/api/use-socket-data';
import { ButtonSetting } from '../components/button-setting';
import { useGitHubDownload } from '../util/use-github-download';
import { useCurrentTournament } from 'src/api/use-tournament-data';
import { useActiveFields } from 'src/components/sync-effects/sync-fields-to-recoil';

const MainSettingsTab: FC = () => {
  const [darkMode, setDarkMode] = useRecoilState(darkModeAtom);
  const [teamIdentifier, setTeamIdentifier] =
    useRecoilState(teamIdentifierAtom);
  const [followerMode, setFollowerMode] = useRecoilState(
    followerModeEnabledAtom
  );
  const [leaderApiHost, setLeaderApiHost] = useRecoilState(leaderApiHostAtom);
  const [fieldControl, setFieldControl] = useActiveFields();
  const [enableScorekeeperAudio, setScorekeeperAudioEnabled] = useRecoilState(
    scorekeeperAudioEnabledAtom
  );

  const tournament = useCurrentTournament();
  const downloadRelease = useGitHubDownload();

  const handleFieldChange = (value: string[]) => {
    if (!tournament) return;
    setFieldControl(tournament.fields.filter((f) => value.includes(f)));
  };

  const handleFollowerModeChange = (value: boolean) => {
    setFollowerMode(value);
    if (!value) {
      setLeaderApiHost('');
      APIOptions.host = `http://${window.location.hostname}`;
    }
  };

  const handleLeaderAddressChange = (value: string | number) => {
    setLeaderApiHost(value.toString());
    APIOptions.host = value.toString();
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

  const download = async () => {
    try {
      const releaseUrl = await downloadRelease();
      const link = document.createElement('a');
      link.download = 'ems-latest';
      link.href = releaseUrl;
      link.click();
    } catch (e) {
      console.error(e);
    }
  };

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
      <MultiSelectSetting
        name='Field Control'
        value={fieldControl.map((f) => f)}
        options={tournament?.fields?.map((f) => f) ?? []}
        onChange={updateFieldControl}
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
      <ButtonSetting
        name='Check For Updates'
        buttonText='Check Now'
        onClick={download}
        inline
      />
      <SwitchSetting
        name='Scorekeeper Audio'
        value={enableScorekeeperAudio}
        onChange={setScorekeeperAudioEnabled}
        inline
      />
    </Box>
  );
};

export default MainSettingsTab;
