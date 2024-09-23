import { Box } from '@mui/material';
import { FC, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  allClearColorAtom,
  blueWledWebSocketAddressAtom,
  centerWledWebSocketAddressAtom,
  fieldFaultColorAtom,
  fieldOptionsSelector,
  foodProductionDelayMsAtom,
  foodProductionMotorDurationMsAtom,
  foodProductionMotorSetpointAtom,
  foodResetMotorDurationMsAtom,
  foodResetMotorSetpointAtom,
  goalBlueOnlyColorAtom,
  goalEmptyColorAtom,
  goalFullColorAtom,
  goalFullSecondaryColorAtom,
  goalGreenOnlyColorAtom,
  goalLedLengthAtom,
  matchEndBlueNexusGoalColorAtom,
  matchEndRampColorAtom,
  matchEndRedNexusGoalColorAtom,
  prepareFieldColorAtom,
  rampBalancedColorAtom,
  rampBalancedHysteresisWindowMsAtom,
  rampLedLengthAtom,
  rampUnbalancedColorAtom,
  rampUnbalancedHysteresisWindowMsAtom,
  redWledWebSocketAddressAtom
} from './stores/settings-store';
import { NumberSetting } from 'src/apps/settings/components/number-setting';
import { useSocket } from 'src/api/use-socket';
import { FeedingTheFutureFCS } from '@toa-lib/models';
import { TextSetting } from 'src/apps/settings/components/text-setting';
import { ColorSetting } from 'src/apps/settings/components/color-setting';

export const Settings: FC = () => {
  const [socket] = useSocket();
  const [goalLedLength, setGoalLedLength] = useRecoilState(goalLedLengthAtom);
  const [rampLedLength, setRampLedLength] = useRecoilState(rampLedLengthAtom);
  const [allClearColor, setAllClearColor] = useRecoilState(allClearColorAtom);
  const [prepareFieldColor, setPrepareFieldColor] = useRecoilState(
    prepareFieldColorAtom
  );
  const [fieldFaultColor, setFieldFaultColor] =
    useRecoilState(fieldFaultColorAtom);
  const [matchEndRedNexusGoalColor, setMatchEndRedNexusGoalColor] =
    useRecoilState(matchEndRedNexusGoalColorAtom);
  const [matchEndBlueNexusGoalColor, setMatchEndBlueNexusGoalColor] =
    useRecoilState(matchEndBlueNexusGoalColorAtom);
  const [matchEndRampColor, setMatchEndRampColor] = useRecoilState(
    matchEndRampColorAtom
  );
  const [redWledWebSocketAddress, setRedWledWebSocketAddress] = useRecoilState(
    redWledWebSocketAddressAtom
  );
  const [blueWledWebSocketAddress, setBlueWledWebSocketAddress] =
    useRecoilState(blueWledWebSocketAddressAtom);
  const [centerWledWebSocketAddress, setCenterWledWebSocketAddress] =
    useRecoilState(centerWledWebSocketAddressAtom);
  const [foodProductionMotorSetpoint, setFoodProductionMotorSetpoint] =
    useRecoilState(foodProductionMotorSetpointAtom);
  const [foodProductionMotorDurationMs, setFoodProductionMotorDurationMs] =
    useRecoilState(foodProductionMotorDurationMsAtom);
  const [foodResetMotorSetpoint, setFoodResetMotorSetpoint] = useRecoilState(
    foodResetMotorSetpointAtom
  );
  const [foodResetMotorDurationMs, setFoodResetMotorDurationMs] =
    useRecoilState(foodResetMotorDurationMsAtom);
  const [foodProductionDelayMs, setFoodProductionDelayMs] = useRecoilState(
    foodProductionDelayMsAtom
  );
  const [rampBalancedHysteresisWindowMs, setRampBalancedHysteresisWindowMs] =
    useRecoilState(rampBalancedHysteresisWindowMsAtom);
  const [
    rampUnbalancedHysteresisWindowMs,
    setRampUnbalancedHysteresisWindowMs
  ] = useRecoilState(rampUnbalancedHysteresisWindowMsAtom);
  const [goalEmptyColor, setGoalEmptyColor] =
    useRecoilState(goalEmptyColorAtom);
  const [goalBlueOnlyColor, setGoalBlueOnlyColor] = useRecoilState(
    goalBlueOnlyColorAtom
  );
  const [goalGreenOnlyColor, setGoalGreenOnlyColor] = useRecoilState(
    goalGreenOnlyColorAtom
  );
  const [goalFullColor, setGoalFullColor] = useRecoilState(goalFullColorAtom);
  const [goalFullSecondaryColor, setGoalFullSecondaryColor] = useRecoilState(
    goalFullSecondaryColorAtom
  );
  const [rampBalancedColor, setRampBalancedColor] = useRecoilState(
    rampBalancedColorAtom
  );
  const [rampUnbalancedColor, setRampUnbalancedColor] = useRecoilState(
    rampUnbalancedColorAtom
  );

  const fieldOptions: FeedingTheFutureFCS.FieldOptions =
    useRecoilValue(fieldOptionsSelector);

  useEffect(() => {
    socket?.emit('fcs:settings', fieldOptions);
  }, [fieldOptions]);

  return (
    <Box>
      <NumberSetting
        name='Goal LED Length'
        value={goalLedLength}
        onChange={setGoalLedLength}
        type='number'
        inline
      />
      <NumberSetting
        name='Ramp LED Length'
        value={rampLedLength}
        onChange={setRampLedLength}
        type='number'
        inline
      />
      <ColorSetting
        name='All Clear Color'
        value={allClearColor}
        onChange={setAllClearColor}
        format='string'
        inline
      />
      <ColorSetting
        name='Prepare Field Color'
        value={prepareFieldColor}
        onChange={setPrepareFieldColor}
        format='string'
        inline
      />
      <ColorSetting
        name='Field Fault Color'
        value={fieldFaultColor}
        onChange={setFieldFaultColor}
        format='string'
        inline
      />
      <ColorSetting
        name='Match End Red Nexus Goal Color'
        value={matchEndRedNexusGoalColor}
        onChange={setMatchEndRedNexusGoalColor}
        format='string'
        inline
      />
      <ColorSetting
        name='Match End Blue Nexus Goal Color'
        value={matchEndBlueNexusGoalColor}
        onChange={setMatchEndBlueNexusGoalColor}
        format='string'
        inline
      />
      <ColorSetting
        name='Match End Ramp Color'
        value={matchEndRampColor}
        onChange={setMatchEndRampColor}
        format='string'
        inline
      />
      <TextSetting
        name='Red WLED WebSocket Address'
        value={redWledWebSocketAddress}
        onChange={setRedWledWebSocketAddress}
        inline
      />
      <TextSetting
        name='Blue WLED WebSocket Address'
        value={blueWledWebSocketAddress}
        onChange={setBlueWledWebSocketAddress}
        inline
      />
      <TextSetting
        name='Center WLED WebSocket Address'
        value={centerWledWebSocketAddress}
        onChange={setCenterWledWebSocketAddress}
        inline
      />
      <NumberSetting
        name='Food Production Motor Setpoint'
        value={foodProductionMotorSetpoint}
        onChange={setFoodProductionMotorSetpoint}
        step={0.1}
        min={-1}
        max={1}
        type='number'
        inline
      />
      <NumberSetting
        name='Food Production Motor Duration (ms)'
        value={foodProductionMotorDurationMs}
        onChange={setFoodProductionMotorDurationMs}
        type='number'
        inline
      />
      <NumberSetting
        name='Food Reset Motor Setpoint'
        value={foodResetMotorSetpoint}
        onChange={setFoodResetMotorSetpoint}
        step={0.1}
        min={-1}
        max={1}
        type='number'
        inline
      />
      <NumberSetting
        name='Food Reset Motor Duration (ms)'
        value={foodResetMotorDurationMs}
        onChange={setFoodResetMotorDurationMs}
        type='number'
        inline
      />
      <NumberSetting
        name='Food Production Delay (ms)'
        value={foodProductionDelayMs}
        onChange={setFoodProductionDelayMs}
        type='number'
        inline
      />
      <NumberSetting
        name='Ramp Balanced Hysteresis Window (ms)'
        value={rampBalancedHysteresisWindowMs}
        onChange={setRampBalancedHysteresisWindowMs}
        type='number'
        inline
      />
      <NumberSetting
        name='Ramp Unbalanced Hysteresis Window (ms)'
        value={rampUnbalancedHysteresisWindowMs}
        onChange={setRampUnbalancedHysteresisWindowMs}
        type='number'
        inline
      />
      <ColorSetting
        name='Empty Goal Color'
        value={goalEmptyColor}
        onChange={setGoalEmptyColor}
        format='string'
        inline
      />
      <ColorSetting
        name='Blue Only Goal Color'
        value={goalBlueOnlyColor}
        onChange={setGoalBlueOnlyColor}
        format='string'
        inline
      />
      <ColorSetting
        name='Green Only Goal Color'
        value={goalGreenOnlyColor}
        onChange={setGoalGreenOnlyColor}
        format='string'
        inline
      />
      <ColorSetting
        name='Full Goal Color'
        value={goalFullColor}
        onChange={setGoalFullColor}
        format='string'
        inline
      />
      <ColorSetting
        name='Full Goal Secondary Color'
        value={goalFullSecondaryColor}
        onChange={setGoalFullSecondaryColor}
        format='string'
        inline
      />
      <ColorSetting
        name='Ramp Balanced Color'
        value={rampBalancedColor}
        onChange={setRampBalancedColor}
        format='string'
        inline
      />
      <ColorSetting
        name='Ramp Unbalanced Color'
        value={rampUnbalancedColor}
        onChange={setRampUnbalancedColor}
        format='string'
        inline
      />
    </Box>
  );
};
