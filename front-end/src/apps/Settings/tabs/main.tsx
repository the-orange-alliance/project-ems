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
        onChange={handleFieldChange}
        inline
      />
      <SwitchSetting
        name='Follower Mode'
        value={followerMode}
        onChange={handleFollowerModeChange}
        inline
      />
      <TextSetting
        name='Leader Api Host'
        value={leaderApiHost}
        onChange={handleLeaderAddressChange}
        inline
        disabled={!followerMode}
      />
    </Box>
  );
};

export default MainSettingsTab;
