import { FC } from 'react';
import Box from '@mui/material/Box';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  currentTournamentFieldsAtom,
  currentTournamentFieldsSelector,
  darkModeAtom,
  teamIdentifierAtom
} from 'src/stores/NewRecoil';
import SwitchSetting from '../components/SwitchSetting';
import DropdownSetting from '../components/DropdownSetting';
import { TeamKeys } from '@toa-lib/models';
import { MultiSelectSetting } from '../components/MultiSelectSetting';

const MainSettingsTab: FC = () => {
  const [darkMode, setDarkMode] = useRecoilState(darkModeAtom);
  const [teamIdentifier, setTeamIdentifier] =
    useRecoilState(teamIdentifierAtom);

  const allFields = useRecoilValue(currentTournamentFieldsSelector);
  const [fieldControl, setFieldControl] = useRecoilState(
    currentTournamentFieldsAtom
  );

  const handleFieldChange = (value: string[]) => {
    setFieldControl(allFields.filter((f) => value.includes(f.name)));
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
    </Box>
  );
};

export default MainSettingsTab;
