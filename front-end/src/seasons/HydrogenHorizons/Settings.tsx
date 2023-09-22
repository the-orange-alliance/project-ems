import { FC } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useRecoilState } from 'recoil';
import {
  motorOneClosePositionAtom,
  motorOneOpenPositionAtom,
  motorTwoClosePositionAtom,
  motorTwoOpenPositionAtom
} from './stores/Recoil';
import NumberSetting from 'src/apps/Settings/components/NumberSetting';

const SettingsTab: FC = () => {
  const [motorOneOpenPosition, setMotorOneOpenPosition] = useRecoilState(
    motorOneOpenPositionAtom
  );
  const [motorOneClosePosition, setMotorOneClosePosition] = useRecoilState(
    motorOneClosePositionAtom
  );
  const [motorTwoOpenPosition, setMotorTwoOpenPosition] = useRecoilState(
    motorTwoOpenPositionAtom
  );
  const [motorTwoClosePosition, setMotorTwoClosePosition] = useRecoilState(
    motorTwoClosePositionAtom
  );
  return (
    <Box>
      <Typography variant='h6'>Hydrogen Horizons Season Options</Typography>
      <NumberSetting
        name='Motor One Open Position'
        value={motorOneOpenPosition}
        onChange={setMotorOneOpenPosition}
        inline
      />
      <NumberSetting
        name='Motor One Close Position'
        value={motorOneClosePosition}
        onChange={setMotorOneClosePosition}
        inline
      />
      <NumberSetting
        name='Motor Two Open Position'
        value={motorTwoOpenPosition}
        onChange={setMotorTwoOpenPosition}
        inline
      />
      <NumberSetting
        name='Motor Two Close Position'
        value={motorTwoClosePosition}
        onChange={setMotorTwoClosePosition}
        inline
      />
    </Box>
  );
};

export default SettingsTab;
