import { Box } from '@mui/material';
import { FC, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  allClearColorAtom,
  blueWledWebSocketAddressAtom,
  centerWledWebSocketAddressAtom,
  fieldFaultColorAtom,
  fieldOptionsSelector,
  foodProductionMotorDurationSecondsAtom,
  foodProductionMotorSetpointAtom,
  foodResetMotorSetpointAtom,
  goalLedLengthAtom,
  matchEndBlueNexusGoalColorAtom,
  matchEndRampColorAtom,
  matchEndRedNexusGoalColorAtom,
  prepareFieldColorAtom,
  rampLedLengthAtom,
  redWledWebSocketAddressAtom
} from './stores/settings-store';
import { NumberSetting } from 'src/apps/settings/components/number-setting';
import { useSocket } from 'src/api/use-socket';
import { FieldOptions } from '@toa-lib/models';
import { TextSetting } from 'src/apps/settings/components/text-setting';

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
  const [
    foodProductionMotorDurationSeconds,
    setFoodProductionMotorDurationSeconds
  ] = useRecoilState(foodProductionMotorDurationSecondsAtom);
  const [foodResetMotorSetpoint, setFoodResetMotorSetpoint] = useRecoilState(
    foodResetMotorSetpointAtom
  );

  const fieldOptions: FieldOptions = useRecoilValue(fieldOptionsSelector);

  useEffect(() => {
    socket?.emit('fcs:settings', fieldOptions);
  }, [fieldOptions]);

  return (
    <Box>
      <NumberSetting
        name='Goal LED Length'
        value={goalLedLength}
        onChange={setGoalLedLength}
        inline
      />
      <NumberSetting
        name='Ramp LED Length'
        value={rampLedLength}
        onChange={setRampLedLength}
        inline
      />
      <TextSetting
        name='All Clear Color'
        value={allClearColor}
        onChange={setAllClearColor}
        inline
      />
      <TextSetting
        name='Prepare Field Color'
        value={prepareFieldColor}
        onChange={setPrepareFieldColor}
        inline
      />
      <TextSetting
        name='Field Fault Color'
        value={fieldFaultColor}
        onChange={setFieldFaultColor}
        inline
      />
      <TextSetting
        name='Match End Red Nexus Goal Color'
        value={matchEndRedNexusGoalColor}
        onChange={setMatchEndRedNexusGoalColor}
        inline
      />
      <TextSetting
        name='Match End Blue Nexus Goal Color'
        value={matchEndBlueNexusGoalColor}
        onChange={setMatchEndBlueNexusGoalColor}
        inline
      />
      <TextSetting
        name='Match End Ramp Color'
        value={matchEndRampColor}
        onChange={setMatchEndRampColor}
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
        inline
      />
      <NumberSetting
        name='Food Production Moto rDuration Seconds'
        value={foodProductionMotorDurationSeconds}
        onChange={setFoodProductionMotorDurationSeconds}
        inline
      />
      <NumberSetting
        name='Food Reset Motor Setpoint'
        value={foodResetMotorSetpoint}
        onChange={setFoodResetMotorSetpoint}
        inline
      />
    </Box>
  );
};
