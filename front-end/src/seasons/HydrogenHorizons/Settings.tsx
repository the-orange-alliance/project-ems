import { FC } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useRecoilState } from 'recoil';
import {
  redServoReleasedPositionPulseWidthAtom,
  redServoHoldPositionPulseWidthAtom,
  blueServoReleasedPositionPulseWidthAtom,
  blueServoHoldPositionPulseWidthAtom
} from './stores/Recoil';
import NumberSetting from 'src/apps/Settings/components/NumberSetting';

const SettingsTab: FC = () => {
  const [redServoHoldPositionPulseWidth, setRedServoHoldPositionPulseWidth] =
    useRecoilState(redServoHoldPositionPulseWidthAtom);
  const [
    redServoReleasedPositionPulseWidth,
    setRedServoReleasedPositionPulseWidth
  ] = useRecoilState(redServoReleasedPositionPulseWidthAtom);
  const [blueServoOpenPosition, setBlueServoOpenPosition] = useRecoilState(
    blueServoHoldPositionPulseWidthAtom
  );
  const [
    blueServoReleasedPositionPulseWidth,
    setBlueServoReleasedPositionPulseWidth
  ] = useRecoilState(blueServoReleasedPositionPulseWidthAtom);
  return (
    <Box>
      <Typography variant='h6'>Hydrogen Horizons Season Options</Typography>
      <NumberSetting
        name='Red servo hold position pulse width'
        value={redServoHoldPositionPulseWidth}
        onChange={setRedServoHoldPositionPulseWidth}
        inline
      />
      <NumberSetting
        name='Red servo released position pulse width'
        value={redServoReleasedPositionPulseWidth}
        onChange={setRedServoReleasedPositionPulseWidth}
        inline
      />
      <NumberSetting
        name='Blue servo hold position pulse width'
        value={blueServoOpenPosition}
        onChange={setBlueServoOpenPosition}
        inline
      />
      <NumberSetting
        name='Blue servo released position pulse width'
        value={blueServoReleasedPositionPulseWidth}
        onChange={setBlueServoReleasedPositionPulseWidth}
        inline
      />
    </Box>
  );
};

export default SettingsTab;
