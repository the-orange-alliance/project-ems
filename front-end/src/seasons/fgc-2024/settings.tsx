import { Box } from '@mui/material';
import { FC } from 'react';
import { useRecoilState } from 'recoil';
import { SwitchSetting } from 'src/apps/settings/components/switch-setting';
import { testAtom } from './stores/settings-store';

export const Settings: FC = () => {
  const [test, setTest] = useRecoilState(testAtom);

  return (
    <Box>
      <SwitchSetting
        name='Test Setting'
        value={test}
        onChange={setTest}
        inline
      />
    </Box>
  );
};
