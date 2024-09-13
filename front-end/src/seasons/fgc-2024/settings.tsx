import { Box } from '@mui/material';
import { FC } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import {
  allClearColorAtom,
  fieldFaultColorAtom,
  fieldOptionsSelector,
  goalLedLengthAtom,
  matchEndBlueNexusGoalColorAtom,
  matchEndRampColorAtom,
  matchEndRedNexusGoalColorAtom,
  prepareFieldColorAtom,
  rampLedLengthAtom
} from './stores/settings-store';
import { NumberSetting } from 'src/apps/settings/components/number-setting';
import { TextSetting } from 'src/apps/settings/components/text-setting';

export const Settings: FC = () => {
  const [test, setTest] = useRecoilState(testAtom);
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
    </Box>
  );
};
