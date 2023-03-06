import { FC } from 'react';
import Box from '@mui/material/Box';
import { useRecoilState } from 'recoil';
import { darkModeAtom, teamIdentifierAtom } from 'src/stores/NewRecoil';
import SwitchSetting from '../components/SwitchSetting';
import DropdownSetting from '../components/DropdownSetting';
import { TeamKeys } from '@toa-lib/models';

const MainSettingsTab: FC = () => {
  const [darkMode, setDarkMode] = useRecoilState(darkModeAtom);
  const [teamIdentifier, setTeamIdentifier] = useRecoilState(teamIdentifierAtom);

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
    </Box>
  );
};

export default MainSettingsTab;
