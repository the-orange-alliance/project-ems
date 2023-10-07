import { FC } from 'react';
import Box from '@mui/material/Box';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  currentTournamentFieldsAtom,
  currentTournamentFieldsSelector,
  darkModeAtom,
  followerModeEnabledAtom,
  leaderApiHostAtom,
  teamIdentifierAtom
} from 'src/stores/NewRecoil';
import SwitchSetting from '../components/SwitchSetting';
import DropdownSetting from '../components/DropdownSetting';
import { TeamKeys } from '@toa-lib/models';
import { MultiSelectSetting } from '../components/MultiSelectSetting';
import TextSetting from '../components/TextSetting';
import { APIOptions } from '@toa-lib/client';
import { updateSocketClient } from 'src/api/ApiProvider';
import ButtonSetting from '../components/ButtonSetting';
import { useGitHubDownload } from '../util/use-github-download';

const MainSettingsTab: FC = () => {
  const [darkMode, setDarkMode] = useRecoilState(darkModeAtom);
  const [teamIdentifier, setTeamIdentifier] =
    useRecoilState(teamIdentifierAtom);
  const [followerMode, setFollowerMode] = useRecoilState(
    followerModeEnabledAtom
  );
  const [leaderApiHost, setLeaderApiHost] = useRecoilState(leaderApiHostAtom);

  const allFields = useRecoilValue(currentTournamentFieldsSelector);
  const [fieldControl, setFieldControl] = useRecoilState(
    currentTournamentFieldsAtom
  );

  const downloadRelease = useGitHubDownload();

  const handleFieldChange = (value: string[]) => {
    setFieldControl(allFields.filter((f) => value.includes(f.name)));
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
    handleFieldChange(value);

    // Don't hammer the server with requests
    const fields = allFields
      .filter((f) => value.includes(f.name))
      .map((f) => f.field)
      .join(',');
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
        value={fieldControl.map((f) => f.name)}
        options={allFields.map((f) => f.name)}
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
    </Box>
  );
};

export default MainSettingsTab;
