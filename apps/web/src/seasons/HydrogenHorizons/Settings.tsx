import { FC } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useRecoilState } from 'recoil';
import {
  redServoReleasedPositionPulseWidthAtom,
  redServoHoldPositionPulseWidthAtom,
  blueServoReleasedPositionPulseWidthAtom,
  blueServoHoldPositionPulseWidthAtom,
  prepareFieldBlinkinPulseWidthAtom,
  fieldFaultBlinkinPulseWidthAtom,
  solidRedBlinkinPulseWidthAtom,
  solidBlueBlinkinPulseWidthAtom,
  allClearBlinkinPulseWidthAtom,
  redEndgameOxygenGoalBlinkinPulseWidthAtom,
  blueEndgameOxygenGoalBlinkinPulseWidthAtom,
  redEndgameHydrogenGoalBlinkinPulseWidthAtom,
  redEndgameButtonBlinkinPulseWidthAtom,
  blueEndgameHydrogenGoalBlinkinPulseWidthAtom,
  blueEndgameButtonBlinkinPulseWidthAtom,
  redCombinedOxygenGoalBlinkinPulseWidthAtom,
  blueCombinedOxygenGoalBlinkinPulseWidthAtom,
  redCombinedHydrogenGoalBlinkinPulseWidthAtom,
  blueCombinedHydrogenGoalBlinkinPulseWidthAtom,
  redCombinedButtonBlinkinPulseWidthAtom,
  blueCombinedButtonBlinkinPulseWidthAtom
} from './stores/Recoil';
import { NumberSetting } from 'src/apps/settings-app/components/number-setting';

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

  const [prepareFieldBlinkinPulseWidth, setPrepareFieldBlinkinPulseWidth] =
    useRecoilState(prepareFieldBlinkinPulseWidthAtom);

  const [fieldFaultBlinkinPulseWidth, setFieldFaultBlinkinPulseWidth] =
    useRecoilState(fieldFaultBlinkinPulseWidthAtom);

  const [solidRedBlinkinPulseWidth, setSolidRedBlinkinPulseWidth] =
    useRecoilState(solidRedBlinkinPulseWidthAtom);

  const [solidBlueBlinkinPulseWidth, setSolidBlueBlinkinPulseWidth] =
    useRecoilState(solidBlueBlinkinPulseWidthAtom);

  const [allClearBlinkinPulseWidth, setAllClearBlinkinPulseWidth] =
    useRecoilState(allClearBlinkinPulseWidthAtom);

  const [
    redEndgameOxygenGoalBlinkinPulseWidth,
    setRedEndgameOxygenGoalBlinkinPulseWidth
  ] = useRecoilState(redEndgameOxygenGoalBlinkinPulseWidthAtom);

  const [
    blueEndgameOxygenGoalBlinkinPulseWidth,
    setBlueEndgameOxygenGoalBlinkinPulseWidth
  ] = useRecoilState(blueEndgameOxygenGoalBlinkinPulseWidthAtom);

  const [
    redEndgameHydrogenGoalBlinkinPulseWidth,
    setRedEndgameHydrogenGoalBlinkinPulseWidth
  ] = useRecoilState(redEndgameHydrogenGoalBlinkinPulseWidthAtom);

  const [
    blueEndgameHydrogenGoalBlinkinPulseWidth,
    setBlueEndgameHydrogenGoalBlinkinPulseWidth
  ] = useRecoilState(blueEndgameHydrogenGoalBlinkinPulseWidthAtom);

  const [
    redEndgameButtonBlinkinPulseWidth,
    setRedEndgameButtonBlinkinPulseWidth
  ] = useRecoilState(redEndgameButtonBlinkinPulseWidthAtom);

  const [
    blueEndgameButtonBlinkinPulseWidth,
    setBlueEndgameButtonBlinkinPulseWidth
  ] = useRecoilState(blueEndgameButtonBlinkinPulseWidthAtom);

  const [
    redCombinedOxygenGoalBlinkinPulseWidth,
    setRedCombinedOxygenGoalBlinkinPulseWidth
  ] = useRecoilState(redCombinedOxygenGoalBlinkinPulseWidthAtom);

  const [
    blueCombinedOxygenGoalBlinkinPulseWidth,
    setBlueCombinedOxygenGoalBlinkinPulseWidth
  ] = useRecoilState(blueCombinedOxygenGoalBlinkinPulseWidthAtom);

  const [
    redCombinedHydrogenGoalBlinkinPulseWidth,
    setRedCombinedHydrogenGoalBlinkinPulseWidth
  ] = useRecoilState(redCombinedHydrogenGoalBlinkinPulseWidthAtom);

  const [
    blueCombinedHydrogenGoalBlinkinPulseWidth,
    setBlueCombinedHydrogenGoalBlinkinPulseWidth
  ] = useRecoilState(blueCombinedHydrogenGoalBlinkinPulseWidthAtom);

  const [
    redCombinedButtonBlinkinPulseWidth,
    setRedCombinedButtonBlinkinPulseWidth
  ] = useRecoilState(redCombinedButtonBlinkinPulseWidthAtom);

  const [
    blueCombinedButtonBlinkinPulseWidth,
    setBlueCombinedButtonBlinkinPulseWidth
  ] = useRecoilState(blueCombinedButtonBlinkinPulseWidthAtom);

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
      <NumberSetting
        name='Prepare Field pulse width for Blinkin'
        value={prepareFieldBlinkinPulseWidth}
        onChange={setPrepareFieldBlinkinPulseWidth}
        inline
      />
      <NumberSetting
        name='Field Fault pulse width for Blinkin'
        value={fieldFaultBlinkinPulseWidth}
        onChange={setFieldFaultBlinkinPulseWidth}
        inline
      />
      <NumberSetting
        name='Solid Red pulse width for Blinkin'
        value={solidRedBlinkinPulseWidth}
        onChange={setSolidRedBlinkinPulseWidth}
        inline={true}
      />
      <NumberSetting
        name='Solid Blue pulse width for Blinkin'
        value={solidBlueBlinkinPulseWidth}
        onChange={setSolidBlueBlinkinPulseWidth}
        inline={true}
      />
      <NumberSetting
        name='All Clear pulse width for Blinkin'
        value={allClearBlinkinPulseWidth}
        onChange={setAllClearBlinkinPulseWidth}
        inline
      />
      <NumberSetting
        name='Red Endgame Oxygen Goal pulse width for Blinkin'
        value={redEndgameOxygenGoalBlinkinPulseWidth}
        onChange={setRedEndgameOxygenGoalBlinkinPulseWidth}
        inline
      />
      <NumberSetting
        name='Blue Endgame Oxygen Goal pulse width for Blinkin'
        value={blueEndgameOxygenGoalBlinkinPulseWidth}
        onChange={setBlueEndgameOxygenGoalBlinkinPulseWidth}
        inline
      />
      <NumberSetting
        name='Red Endgame Hydrogen Goal pulse width for Blinkin'
        value={redEndgameHydrogenGoalBlinkinPulseWidth}
        onChange={setRedEndgameHydrogenGoalBlinkinPulseWidth}
        inline
      />
      <NumberSetting
        name='Blue Endgame Hydrogen Goal pulse width for Blinkin'
        value={blueEndgameHydrogenGoalBlinkinPulseWidth}
        onChange={setBlueEndgameHydrogenGoalBlinkinPulseWidth}
        inline
      />
      <NumberSetting
        name='Red Endgame Button pulse width for Blinkin'
        value={redEndgameButtonBlinkinPulseWidth}
        onChange={setRedEndgameButtonBlinkinPulseWidth}
        inline
      />
      <NumberSetting
        name='Blue Endgame Button pulse width for Blinkin'
        value={blueEndgameButtonBlinkinPulseWidth}
        onChange={setBlueEndgameButtonBlinkinPulseWidth}
        inline
      />
      <NumberSetting
        name='Red Combined Oxygen Goal pulse width for Blinkin'
        value={redCombinedOxygenGoalBlinkinPulseWidth}
        onChange={setRedCombinedOxygenGoalBlinkinPulseWidth}
        inline
      />
      <NumberSetting
        name='Blue Combined Oxygen Goal pulse width for Blinkin'
        value={blueCombinedOxygenGoalBlinkinPulseWidth}
        onChange={setBlueCombinedOxygenGoalBlinkinPulseWidth}
        inline
      />
      <NumberSetting
        name='Red Combined Hydrogen Goal pulse width for Blinkin'
        value={redCombinedHydrogenGoalBlinkinPulseWidth}
        onChange={setRedCombinedHydrogenGoalBlinkinPulseWidth}
        inline
      />
      <NumberSetting
        name='Blue Combined Hydrogen Goal pulse width for Blinkin'
        value={blueCombinedHydrogenGoalBlinkinPulseWidth}
        onChange={setBlueCombinedHydrogenGoalBlinkinPulseWidth}
        inline
      />
      <NumberSetting
        name='Red Combined Button pulse width for Blinkin'
        value={redCombinedButtonBlinkinPulseWidth}
        onChange={setRedCombinedButtonBlinkinPulseWidth}
        inline
      />
      <NumberSetting
        name='Blue Combined Button pulse width for Blinkin'
        value={blueCombinedButtonBlinkinPulseWidth}
        onChange={setBlueCombinedButtonBlinkinPulseWidth}
        inline
      />
    </Box>
  );
};

export default SettingsTab;
